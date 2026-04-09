document.addEventListener('DOMContentLoaded', () => {

    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/app.html';
    }

    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');

    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');

    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('loginAlert');

    const registerForm = document.getElementById('registerForm');
    const registerAlert = document.getElementById('registerAlert');

    // Toggle Views
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button');

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            btn.disabled = true;

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect
            window.location.href = '/app.html';
        } catch (error) {
            loginAlert.textContent = error.message;
            loginAlert.classList.remove('hidden');
        } finally {
            btn.innerHTML = 'Ingresar <i class="fas fa-arrow-right ml-2"></i>';
            btn.disabled = false;
        }
    });

    // Handle Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const btn = registerForm.querySelector('button');

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            btn.disabled = true;

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error en el registro');
            }

            // Success - automatically log in
            const loginRes = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const loginData = await loginRes.json();

            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify(loginData.user));

            window.location.href = '/app.html';

        } catch (error) {
            registerAlert.textContent = error.message;
            registerAlert.classList.remove('hidden');
        } finally {
            btn.innerHTML = 'Registrarme <i class="fas fa-user-plus ml-2"></i>';
            btn.disabled = false;
        }
    });
});
