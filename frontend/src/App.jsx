import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { getCurrentUser } from './services/authService.js';
import { clearSession, getStoredSession } from './utils/session.js';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!getStoredSession()?.token) {
      setChecking(false);
      return;
    }
    getCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => clearSession())
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    clearSession();
    setUser(null);
  }

  if (checking) return null;
  if (!user) return <AuthPage onAuthenticated={setUser} />;
  return <DashboardPage user={user} onLogout={logout} />;
}
