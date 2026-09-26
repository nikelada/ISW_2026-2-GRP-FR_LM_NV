import Boton from './ui/Boton.jsx';
import { areaDelRol } from '../utils/roles.js';

// Marco de la aplicación: barra superior con navegación entre secciones.
export default function EventosLayout({ user, secciones, activa, onNavegar, onLogout, children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-stone-200 bg-white px-4 py-3 lg:h-16 lg:flex-nowrap lg:px-[4vw] lg:py-0">
        <a className="font-bold text-teal-900" href={`#/${secciones[0].clave}`}>NES Eventos</a>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1" aria-label="Secciones">
          {secciones.map((s) => (
            <a
              key={s.clave}
              href={`#/${s.clave}`}
              aria-current={s.clave === activa ? 'page' : undefined}
              className={`rounded-md px-3.5 py-2 text-sm font-semibold ${s.clave === activa ? 'bg-teal-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              onClick={(e) => { e.preventDefault(); onNavegar(s.clave); }}
            >
              {s.titulo}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="grid text-right text-sm font-semibold" data-usuario>
            {user.name}
            <small className="font-normal text-stone-500" data-area>{areaDelRol(user.role)}</small>
          </span>
          <Boton variante="secundario" onClick={onLogout}>Cerrar sesión</Boton>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-9 lg:px-[4vw]">{children}</main>
    </div>
  );
}
