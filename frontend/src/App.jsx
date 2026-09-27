import { useEffect, useState } from 'react';
import EventosLayout from './components/EventosLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CalendarioPage from './pages/CalendarioPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import ServiciosPage from './pages/ServiciosPage.jsx';
import SolicitudesPage from './pages/SolicitudesPage.jsx';
import { getCurrentUser } from './services/authService.js';
import { clearSession, getStoredSession } from './utils/session.js';

// Secciones de la aplicación (se navega con #/clave?parametros).
const SECCIONES = [
  { clave: 'clientes', titulo: 'Clientes', Pagina: ClientesPage },
  { clave: 'solicitudes', titulo: 'Solicitudes', Pagina: SolicitudesPage },
  { clave: 'servicios', titulo: 'Servicios', Pagina: ServiciosPage },
  { clave: 'calendario', titulo: 'Calendario', Pagina: CalendarioPage }
];

function leerHash() {
  const [clave, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return SECCIONES.some((s) => s.clave === clave)
    ? { vista: clave, params: new URLSearchParams(query) }
    : { vista: SECCIONES[0].clave, params: new URLSearchParams() };
}

export default function App() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [{ vista, params }, setRuta] = useState(leerHash);

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

  useEffect(() => {
    const alCambiarHash = () => setRuta(leerHash());
    window.addEventListener('hashchange', alCambiarHash);
    return () => window.removeEventListener('hashchange', alCambiarHash);
  }, []);

  function navegar(ruta) {
    location.hash = `/${ruta}`;
  }

  function logout() {
    clearSession();
    setUser(null);
    history.replaceState(null, '', location.pathname);
    setRuta(leerHash());
  }

  if (checking) return null;
  if (!user) return <AuthPage onAuthenticated={setUser} />;

  const { Pagina } = SECCIONES.find((s) => s.clave === vista);
  return (
    <EventosLayout user={user} secciones={SECCIONES} activa={vista} onNavegar={navegar} onLogout={logout}>
      <Pagina key={`${vista}?${params}`} user={user} params={params} onNavegar={navegar} />
    </EventosLayout>
  );
}
