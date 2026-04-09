/**
 * spa.js — Router de Single Page Application para FinanzasOS
 * 
 * Cómo funciona:
 * 1. Intercepta clics en los nav-link del sidebar
 * 2. Hace fetch del fragmento HTML de la sección (public/pages/<view>.html)
 * 3. Inyecta el HTML en #page-content
 * 4. Carga dinámicamente el script JS de esa sección y llama window.initPage_<view>()
 * 5. Actualiza la URL con history.pushState (?view=<name>)
 * 6. Maneja el botón Atrás/Adelante del navegador
 */

(function () {
    // Mapa: nombre de vista → script(s) JS a cargar
    const PAGE_SCRIPTS = {
        dashboard:    ['./js/dashboard.js', './js/modals.js'],
        transactions: ['./js/transactions.js', './js/import_extractor.js'],
        accounts:     ['./js/accounts.js'],
        budgets:      ['./js/budgets.js'],
        loans:        ['./js/loans.js'],
        credits:      ['./js/credits.js'],
    };

    // Scripts ya cargados (evita duplicados en el DOM)
    const loadedScripts = new Set();

    // Script actualmente en ejecución (para limpieza)
    let currentView = null;

    // Exponer spaNavigate globalmente para que scripts puedan navegar
    window.spaNavigate = (view) => navigateTo(view);

    // ─── Auth check ───────────────────────────────────────────────────────────
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/index.html';
        return;
    }

    // Mostrar nombre de usuario en el sidebar
    try {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('userProfileName');
        if (nameEl) nameEl.textContent = `Hola, ${user.name.split(' ')[0]}`;
    } catch (_) {}

    // ─── Logout ───────────────────────────────────────────────────────────────
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userName');
        window.location.href = '/index.html';
    });

    // ─── Loader bar ───────────────────────────────────────────────────────────
    const loader = document.getElementById('spa-loader');
    function showLoader() {
        loader.style.display = 'block';
        loader.style.animation = 'none';
        loader.offsetHeight; // reflow
        loader.style.animation = 'spa-slide 0.6s ease-out forwards';
    }
    function hideLoader() {
        loader.style.display = 'none';
    }

    // ─── Set active nav link ──────────────────────────────────────────────────
    function setActiveNav(view) {
        document.querySelectorAll('.sidebar nav .nav-link').forEach(a => {
            a.classList.toggle('active', a.dataset.view === view);
        });
    }

    // ─── Load a script tag dynamically ────────────────────────────────────────
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Si ya existe en el DOM, removemos para re-ejecutar con el nuevo contexto
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) existing.remove();

            const s = document.createElement('script');
            s.src = src + '?_t=' + Date.now(); // cache-bust
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        });
    }

    // ─── Main navigate function ───────────────────────────────────────────────
    async function navigateTo(view, pushState = true) {
        if (!PAGE_SCRIPTS[view]) view = 'dashboard';
        if (currentView === view) return; // ya estamos aquí

        showLoader();
        setActiveNav(view);

        try {
            // 1. Fetch del fragmento HTML
            const res = await fetch(`./pages/${view}.html?_t=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();

            // 2. Inyectar en el área de contenido
            const container = document.getElementById('page-content');
            container.innerHTML = html;

            // 3. Actualizar URL
            if (pushState) {
                history.pushState({ view }, '', `?view=${view}`);
            }

            currentView = view;

            // 4. Cargar scripts de la página y llamar init
            const scripts = PAGE_SCRIPTS[view];
            for (const src of scripts) {
                await loadScript(src);
            }

            // 5. Llamar la función init de la página si existe
            const initFn = window[`initPage_${view}`];
            if (typeof initFn === 'function') {
                initFn();
            }
            // Dashboard también requiere inicializar los modales
            if (view === 'dashboard' && typeof window.initPage_dashboard_modals === 'function') {
                window.initPage_dashboard_modals();
            }

            // 6. Si la página credits tiene botón "Simular Nuevo", conectarlo
            if (view === 'credits') {
                const goBtn = document.getElementById('goToLoansBtn');
                if (goBtn) {
                    goBtn.addEventListener('click', () => navigateTo('loans'));
                }
            }

        } catch (err) {
            console.error(`[SPA] Error cargando vista "${view}":`, err);
            document.getElementById('page-content').innerHTML = `
                <main class="main-content">
                    <div style="padding: 2rem; text-align: center; color: var(--danger);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <h3>Error al cargar la sección</h3>
                        <p style="color: var(--text-muted);">Intenta de nuevo o recarga la página.</p>
                    </div>
                </main>`;
        } finally {
            hideLoader();
        }
    }

    // ─── Interceptar clics del sidebar ────────────────────────────────────────
    document.querySelectorAll('.sidebar nav .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (view) navigateTo(view);
        });
    });

    // ─── Manejar botón Atrás/Adelante ─────────────────────────────────────────
    window.addEventListener('popstate', (e) => {
        const view = (e.state && e.state.view) || getViewFromURL();
        currentView = null; // forzar recarga
        navigateTo(view, false);
    });

    // ─── Obtener vista inicial desde la URL ───────────────────────────────────
    function getViewFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('view') || 'dashboard';
    }

    // ─── Arrancar ─────────────────────────────────────────────────────────────
    const initialView = getViewFromURL();
    navigateTo(initialView, false);
    // Reemplazar la entrada de history para que el estado inicial sea correcto
    history.replaceState({ view: initialView }, '', `?view=${initialView}`);

})();
