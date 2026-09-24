import './style.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const app = document.querySelector('#app');
let mode = 'login';
let isBusy = false;

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem('lumina_session'));
  } catch {
    return null;
  }
}

function saveSession(data) {
  localStorage.setItem('lumina_session', JSON.stringify(data));
}

function clearSession() {
  localStorage.removeItem('lumina_session');
}

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function renderAuth() {
  const isLogin = mode === 'login';
  app.innerHTML = `
    <main class="auth-shell">
      <section class="brand-panel">
        <div class="brand-mark"><span></span><span></span><span></span></div>
        <p class="eyebrow">LUMINA / PRIVATE SPACE</p>
        <h1>Make room for<br /><em>clear thinking.</em></h1>
        <p class="brand-copy">A quiet, focused workspace for the work that matters. Your ideas stay yours.</p>
        <div class="brand-footer"><span class="signal-dot"></span> End-to-end workspace security</div>
      </section>
      <section class="form-panel">
        <div class="form-wrap">
          <div class="mobile-brand"><div class="brand-mark"><span></span><span></span><span></span></div><span>LUMINA</span></div>
          <div class="form-heading">
            <p class="eyebrow">${isLogin ? 'WELCOME BACK' : 'START FRESH'}</p>
            <h2>${isLogin ? 'Sign in to your space' : 'Create your space'}</h2>
            <p>${isLogin ? 'Enter your details to continue where you left off.' : 'A few details and you are ready to begin.'}</p>
          </div>
          <form id="auth-form">
            ${!isLogin ? '<label>Full name<input name="name" type="text" autocomplete="name" placeholder="Alex Morgan" required /></label>' : ''}
            ${!isLogin ? '<label>User type<select name="role" required><option value="usuario">Usuario</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label>' : ''}
            <label>Email address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required /></label>
            <label>Password<div class="password-field"><input name="password" type="password" autocomplete="current-password" placeholder="Minimum 8 characters" required /><button class="password-toggle" type="button" aria-label="Show password">Show</button></div></label>
            ${isLogin ? '<div class="form-options"><label class="check-label"><input type="checkbox" name="remember" checked /> <span>Remember me</span></label><button type="button" class="text-button" id="forgot-button">Forgot password?</button></div>' : '<p class="password-note">Use at least 8 characters for your password.</p>'}
            <p class="form-message" id="form-message" role="alert"></p>
            <button class="primary-button" type="submit"><span>${isLogin ? 'Enter workspace' : 'Create account'}</span><span class="arrow">&#8594;</span></button>
          </form>
          <div class="switch-auth"><span>${isLogin ? 'New to Lumina?' : 'Already have an account?'}</span><button type="button" class="text-button" id="switch-mode">${isLogin ? 'Create an account' : 'Sign in'}</button></div>
          <p class="legal">By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
        </div>
      </section>
    </main>
  `;

  document.querySelector('#auth-form').addEventListener('submit', handleAuth);
  document.querySelector('#switch-mode').addEventListener('click', () => {
    mode = isLogin ? 'register' : 'login';
    renderAuth();
  });
  document.querySelector('.password-toggle').addEventListener('click', (event) => {
    const input = event.currentTarget.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    event.currentTarget.textContent = input.type === 'password' ? 'Show' : 'Hide';
  });
  document.querySelector('#forgot-button')?.addEventListener('click', () => showMessage('Password recovery will be available soon.', 'info'));
}

function renderDashboard(user) {
  app.innerHTML = `
    <main class="dashboard-shell">
      <header class="topbar"><a class="brand-lockup" href="#"><span class="brand-mark"><span></span><span></span><span></span></span><span>LUMINA</span></a><div class="topbar-actions"><span class="status-label"><i></i> All systems clear</span><button id="logout-button" class="logout-button">Sign out <span>&#8599;</span></button></div></header>
      <section class="dashboard-content">
        <div class="welcome-row"><div><p class="eyebrow">AUTHENTICATED USER</p><h1>Good morning, ${user.name.split(' ')[0]}.</h1><p class="welcome-copy">Role: ${user.role}</p></div><div class="avatar">${initials(user.name)}</div></div>
        <div class="overview-grid"><article class="feature-card"><div class="card-top"><span class="card-icon">&#10022;</span><span class="card-kicker">YOUR SPACE</span></div><h2>Keep your best<br /><em>thinking close.</em></h2><p>This is your private workspace. Everything you create here belongs to you.</p><button class="card-action">Open workspace <span>&#8594;</span></button></article><article class="stat-card"><span class="card-kicker">ACCOUNT STATUS</span><strong>Active</strong><span class="stat-line"><i></i> Protected and synced</span></article><article class="stat-card light"><span class="card-kicker">MEMBER SINCE</span><strong>September<br />2026</strong><span class="stat-line">Just getting started</span></article></div>
        <div class="lower-row"><div><p class="eyebrow">RECENT ACTIVITY</p><h3>A clean slate.</h3></div><p class="empty-note">Your activity will appear here as you make progress.</p></div>
      </section>
      <footer class="dashboard-footer"><span>© 2026 Lumina</span><span>Signed in as ${user.email}</span></footer>
    </main>
  `;
  document.querySelector('#logout-button').addEventListener('click', () => {
    clearSession();
    mode = 'login';
    renderAuth();
  });
}

function showMessage(message, type = 'error') {
  const target = document.querySelector('#form-message');
  if (!target) return;
  target.textContent = message;
  target.className = `form-message ${type}`;
}

async function handleAuth(event) {
  event.preventDefault();
  if (isBusy) return;
  isBusy = true;
  const form = new FormData(event.currentTarget);
  const endpoint = mode === 'login' ? 'login' : 'register';
  const button = event.currentTarget.querySelector('.primary-button');
  button.disabled = true;
  button.querySelector('span').textContent = mode === 'login' ? 'Checking...' : 'Creating...';

  try {
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Something went wrong.');
    saveSession(data);
    renderDashboard(data.user);
  } catch (error) {
    showMessage(error.message);
    button.disabled = false;
    button.querySelector('span').textContent = mode === 'login' ? 'Enter workspace' : 'Create account';
  } finally {
    isBusy = false;
  }
}

async function bootstrap() {
  const session = getStoredSession();
  if (!session?.token) return renderAuth();
  try {
    const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (!response.ok) throw new Error('Session expired');
    const data = await response.json();
    renderDashboard(data.user);
  } catch {
    clearSession();
    renderAuth();
  }
}

bootstrap();
