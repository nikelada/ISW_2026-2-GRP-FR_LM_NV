import { useEffect, useState } from 'react';
import EventosLayout from './components/EventosLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CalendarioPage from './pages/CalendarioPage.jsx';
import CambiosPage from './pages/CambiosPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import HistorialPage from './pages/HistorialPage.jsx';
import ServiciosPage from './pages/ServiciosPage.jsx';
import SolicitudesPage from './pages/SolicitudesPage.jsx';
import InventarioPage from './pages/InventarioPage.jsx';
import OperacionesPage from './pages/OperacionesPage.jsx';
import { getCurrentUser } from './services/authService.js';
import * as cambioService from './services/cambioService.js';
import { esGerencia } from './utils/roles.js';
import { clearSession, getStoredSession } from './utils/session.js';

// Secciones del menú (se navega con #/clave?parametros)
const SECCIONES = [
  { clave: 'clientes', titulo: 'Clientes', Pagina: ClientesPage },
  { clave: 'solicitudes', titulo: 'Solicitudes', Pagina: SolicitudesPage },
  { clave: 'servicios', titulo: 'Servicios', Pagina: ServiciosPage },
  { clave: 'calendario', titulo: 'Calendario', Pagina: CalendarioPage },
  { clave: 'cambios', titulo: 'Cambios', Pagina: CambiosPage },
  { clave: 'historial', titulo: 'Historial', Pagina: HistorialPage },
  { clave: 'inventario', titulo: 'Inventario', Pagina: InventarioPage },
  { clave: 'operaciones', titulo: 'Operaciones', Pagina: OperacionesPage }
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
  const [pendientes, setPendientes] = useState(0);

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

  // Gerencia ve en el menú cuántos cambios le faltan por revisar
  useEffect(() => {
    if (!esGerencia(user)) {
      setPendientes(0);
      return;
    }
    cambioService.listar('pendiente').then((cambios) => setPendientes(cambios.length)).catch(() => {});
  }, [user, vista]);

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
  const secciones = SECCIONES.map((s) => (s.clave === 'cambios' && pendientes ? { ...s, titulo: `Cambios (${pendientes})` } : s));
  return (
    <EventosLayout user={user} secciones={secciones} activa={vista} onNavegar={navegar} onLogout={logout}>
      <Pagina key={`${vista}?${params}`} user={user} params={params} onNavegar={navegar} />
    </EventosLayout>
  );
}
