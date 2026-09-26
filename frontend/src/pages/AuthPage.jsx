import { useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import { login, register } from '../services/authService.js';
import { saveSession } from '../utils/session.js';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState({ text: '', type: 'error' });
  const [isBusy, setIsBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === 'login';

  function switchMode() {
    setMode(isLogin ? 'register' : 'login');
    setMessage({ text: '', type: 'error' });
    setShowPassword(false);
  }

  async function handleAuth(event) {
    event.preventDefault();
    if (isBusy) return;
    setIsBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const session = isLogin ? await login(data) : await register(data);
      saveSession(session);
      onAuthenticated(session.user);
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
      setIsBusy(false);
    }
  }

  const busyLabel = isLogin ? 'Checking...' : 'Creating...';
  const submitLabel = isLogin ? 'Enter workspace' : 'Create account';

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <BrandMark />
        <p className="eyebrow">LUMINA / PRIVATE SPACE</p>
        <h1>Make room for<br /><em>clear thinking.</em></h1>
        <p className="brand-copy">A quiet, focused workspace for the work that matters. Your ideas stay yours.</p>
        <div className="brand-footer"><span className="signal-dot"></span> End-to-end workspace security</div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="mobile-brand"><BrandMark /><span>LUMINA</span></div>
          <div className="form-heading">
            <p className="eyebrow">{isLogin ? 'WELCOME BACK' : 'START FRESH'}</p>
            <h2>{isLogin ? 'Sign in to your space' : 'Create your space'}</h2>
            <p>{isLogin ? 'Enter your details to continue where you left off.' : 'A few details and you are ready to begin.'}</p>
          </div>
          <form id="auth-form" key={mode} onSubmit={handleAuth}>
            {!isLogin && <label>Full name<input name="name" type="text" autoComplete="name" placeholder="Alex Morgan" required /></label>}
            {!isLogin && (
              <label>User type
                <select name="role" required>
                  <option value="usuario">Usuario</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            )}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password
              <div className="password-field">
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Minimum 8 characters" required />
                <button className="password-toggle" type="button" aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {isLogin ? (
              <div className="form-options">
                <label className="check-label"><input type="checkbox" name="remember" defaultChecked /> <span>Remember me</span></label>
                <button type="button" className="text-button" id="forgot-button" onClick={() => setMessage({ text: 'Password recovery will be available soon.', type: 'info' })}>Forgot password?</button>
              </div>
            ) : (
              <p className="password-note">Use at least 8 characters for your password.</p>
            )}
            <p className={`form-message ${message.type}`} id="form-message" role="alert">{message.text}</p>
            <button className="primary-button" type="submit" disabled={isBusy}>
              <span>{isBusy ? busyLabel : submitLabel}</span><span className="arrow">→</span>
            </button>
          </form>
          <div className="switch-auth">
            <span>{isLogin ? 'New to Lumina?' : 'Already have an account?'}</span>
            <button type="button" className="text-button" id="switch-mode" onClick={switchMode}>{isLogin ? 'Create an account' : 'Sign in'}</button>
          </div>
          <p className="legal">By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.</p>
        </div>
      </section>
    </main>
  );
}
