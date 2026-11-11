import { useEffect, useState } from 'react';
import EventosLayout from './components/EventosLayout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CalendarioPage from './pages/CalendarioPage.jsx';
import CambiosPage from './pages/CambiosPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import CotizacionesPage from './pages/CotizacionesPage.jsx';
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
  { clave: 'clientes', titulo: 'Clientes', Pagina: ClientesPage, roles: ['usuario', 'admin'] },
  { clave: 'solicitudes', titulo: 'Solicitudes', Pagina: SolicitudesPage, roles: ['usuario', 'admin'] },
  { clave: 'servicios', titulo: 'Servicios', Pagina: ServiciosPage, roles: ['usuario', 'manager', 'admin'] },
  { clave: 'cotizaciones', titulo: 'Cotizaciones', Pagina: CotizacionesPage, roles: ['usuario', 'manager', 'admin'] },
  { clave: 'calendario', titulo: 'Calendario', Pagina: CalendarioPage, roles: ['usuario', 'manager', 'admin'] },
  { clave: 'cambios', titulo: 'Cambios', Pagina: CambiosPage, roles: ['usuario', 'manager', 'admin'] },
  { clave: 'historial', titulo: 'Historial', Pagina: HistorialPage, roles: ['usuario', 'admin'] },
  { clave: 'inventario', titulo: 'Inventario', Pagina: InventarioPage, roles: ['manager', 'admin'] },
  { clave: 'operaciones', titulo: 'Operaciones', Pagina: OperacionesPage, roles: ['manager', 'admin'] }
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
  const seccionesPermitidas = SECCIONES.filter((s) => s.roles.includes(user?.role));
  const seccionActual =
    seccionesPermitidas.find((s) => s.clave === vista) ?? seccionesPermitidas[0];

  useEffect(() => {
    if (seccionActual && seccionActual.clave !== vista) {
      location.hash = `/${seccionActual.clave}`;
    }
  }, [seccionActual, vista]);
  
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

  if (!seccionActual) return <p>Este usuario no tiene pestañas disponibles.</p>;

  const secciones = seccionesPermitidas.map((s) =>
    s.clave === 'cambios' && pendientes
      ? { ...s, titulo: `Cambios (${pendientes})` }
      : s
  );

  return (
    <EventosLayout
      user={user}
      secciones={secciones}
      activa={seccionActual.clave}
      onNavegar={navegar}
      onLogout={logout}
    >
      <seccionActual.Pagina
        key={`${seccionActual.clave}?${params}`}
        user={user}
        params={params}
        onNavegar={navegar}
      />
    </EventosLayout>
  );
}
