import { etiquetaCampo } from '../utils/camposEvento.js';
import EstadoCambio from './EstadoCambio.jsx';

const fecha = (valor) => new Date(valor).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

// Lista corta de cambios con enlace a su detalle en Cambios
export default function ListaCambios({ cambios }) {
  if (!cambios.length) return <p className="text-xs text-stone-500">Sin cambios solicitados.</p>;
  return (
    <ul className="grid gap-2 text-sm" aria-label="Lista de cambios">
      {cambios.map((c) => (
        <li key={c.id} className="flex items-start justify-between gap-2 rounded-md border border-stone-200 px-3 py-2">
          <div className="min-w-0">
            <a className="whitespace-nowrap font-semibold text-teal-700 hover:underline" href={`#/cambios?id=${c.id}`}>{c.codigo}</a>
            <span className="block text-xs text-stone-500">{Object.keys(c.cambios).map(etiquetaCampo).join(', ')} · {fecha(c.createdAt)}</span>
          </div>
          <span className="flex flex-wrap justify-end gap-1"><EstadoCambio cambio={c} /></span>
        </li>
      ))}
    </ul>
  );
}
