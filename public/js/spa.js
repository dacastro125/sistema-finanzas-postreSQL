/**
 * spa.js — Router de Single Page Application para FinanzasOS
 */

(function () {
    // Mapa: nombre de vista → script(s) JS a cargar (rutas absolutas)
    const PAGE_SCRIPTS = {
        dashboard:    ['/js/dashboard.js', '/js/modals.js'],
        transactions: ['/js/transactions.js', '/js/import_extractor.js'],
        accounts:     ['/js/accounts.js'],
        budgets:      ['/js/budgets.js'],
        loans:        ['/js/loans.js'],
        credits:      ['/js/credits.js'],
        ai:           [], // placeholder — no scripts yet
    };

    let currentView = null;
    let hasError = false;

    // Exponer spaNavigate globalmente
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
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userName');
            window.location.href = '/index.html';
        });
    }

    // ─── Loader bar ───────────────────────────────────────────────────────────
    const loader = document.getElementById('spa-loader');
    function showLoader() {
        if (!loader) return;
        loader.style.display = 'block';
        loader.style.animation = 'none';
        loader.offsetHeight;
        loader.style.animation = 'spa-slide 0.6s ease-out forwards';
    }
    function hideLoader() {
        if (!loader) return;
        loader.style.display = 'none';
    }

    // ─── Set active nav link ──────────────────────────────────────────────────
    function setActiveNav(view) {
        document.querySelectorAll('.sidebar nav .nav-link').forEach(a => {
            a.classList.toggle('active', a.dataset.view === view);
        });
    }

    // ─── Load a script tag dynamically (con reintentos) ──────────────────────
    function loadScript(src, attempt = 0) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src^="${src}"]`);
            if (existing) existing.remove();

            const s = document.createElement('script');
            s.src = src + '?_t=' + Date.now();
            s.onload = resolve;
            s.onerror = () => {
                if (attempt < 3) {
                    // Reintento tras 2s (da tiempo al servidor a despertar)
                    setTimeout(() => {
                        loadScript(src, attempt + 1).then(resolve).catch(reject);
                    }, 2000);
                } else {
                    reject(new Error(`Error cargando script: ${src}`));
                }
            };
            document.body.appendChild(s);
        });
    }

    // ─── Main navigate function ───────────────────────────────────────────────
    async function navigateTo(view, pushState = true) {
        if (!PAGE_SCRIPTS[view]) view = 'dashboard';

        // Solo bloquear si ya estamos aquí Y no hubo error previo
        if (currentView === view && !hasError) return;

        showLoader();
        setActiveNav(view);
        hasError = false;

        try {
            // 1. Fetch del fragmento HTML con ruta absoluta
            const res = await fetch(`/pages/${view}.html?_t=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status} al cargar /pages/${view}.html`);
            const html = await res.text();

            // 2. Inyectar en el área de contenido
            const container = document.getElementById('page-content');
            if (!container) throw new Error('No se encontró #page-content');
            container.innerHTML = html;

            // 3. Actualizar URL
            if (pushState) {
                history.pushState({ view }, '', `?view=${view}`);
            }

            currentView = view;

            // 4. Cargar scripts de la página secuencialmente
            const scripts = PAGE_SCRIPTS[view];
            for (const src of scripts) {
                await loadScript(src);
            }

            // 5. Llamar la función init de la página si existe
            const initFn = window[`initPage_${view}`];
            if (typeof initFn === 'function') {
                initFn();
            }

            // Dashboard también requiere inicializar modales
            if (view === 'dashboard' && typeof window.initPage_dashboard_modals === 'function') {
                window.initPage_dashboard_modals();
            }

            // Credits: conectar botón de navegar a loans
            if (view === 'credits') {
                const goBtn = document.getElementById('goToLoansBtn');
                if (goBtn) {
                    goBtn.addEventListener('click', () => navigateTo('loans'));
                }
            }

        } catch (err) {
            console.error(`[SPA] Error cargando vista "${view}":`, err);
            hasError = true;
            currentView = null; // permitir reintento
            const container = document.getElementById('page-content');
            if (container) {
                container.innerHTML = `
                <main class="main-content">
                    <div style="padding: 2rem; text-align: center; color: var(--danger);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <h3>Error al cargar la sección</h3>
                        <p style="color: var(--text-muted); margin-bottom: 1rem;">Intenta de nuevo o recarga la página.</p>
                        <button class="btn" onclick="window.spaNavigate('${view}')" style="width:auto;">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </div>
                </main>`;
            }
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
    history.replaceState({ view: initialView }, '', `?view=${initialView}`);

})();
