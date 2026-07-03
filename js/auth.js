// Check if already logged in
(function() {
    const token = localStorage.getItem('moon_token');
    if (token) {
        window.location.href = 'chat.html';
    }
})();

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

let isLoginMode = true;

// Toggle between login and register
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        authTitle.textContent = 'Sign In';
        authSubtitle.textContent = 'Access your Moon AI workspace';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Sign Up</a>';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Start using Moon AI today';
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-link">Sign In</a>';
    }

    // Re-attach toggle listener
    document.getElementById('toggle-link').addEventListener('click', arguments.callee.bind(null, { preventDefault: () => {} }));
    loginError.textContent = '';
    registerError.textContent = '';
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        localStorage.setItem('moon_token', data.access_token);
        localStorage.setItem('moon_username', data.username);
        window.location.href = 'chat.html';
    } catch (err) {
        loginError.textContent = err.message;
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (password.length < 6) {
        registerError.textContent = 'Password must be at least 6 characters';
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        return;
    }

    try {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }

        localStorage.setItem('moon_token', data.access_token);
        localStorage.setItem('moon_username', data.username);
        window.location.href = 'chat.html';
    } catch (err) {
        registerError.textContent = err.message;
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
    }
});
