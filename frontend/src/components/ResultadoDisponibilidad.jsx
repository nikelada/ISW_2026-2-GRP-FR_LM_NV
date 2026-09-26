import { formatearFecha, formatearHorario } from '../utils/fechas.js';

// Resultado de revisar la disponibilidad de una fecha y horario.
export default function ResultadoDisponibilidad({ resultado }) {
  if (!resultado) return null;
  if (resultado.disponible) {
    return (
      <div role="status" data-disponibilidad="ok" className="my-3.5 rounded-md border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-900">
        <strong>Fecha disponible</strong>
        <p className="mt-1.5">{resultado.message || 'No hay eventos confirmados que se superpongan con ese horario.'}</p>
      </div>
    );
  }
  return (
    <div role="alert" data-disponibilidad="conflicto" className="my-3.5 rounded-md border border-red-300 bg-red-50 p-3.5 text-sm text-red-900">
      <strong>Conflicto de fecha</strong>
      <p className="mt-1.5">{resultado.message || 'El horario se superpone con un evento confirmado; no se puede confirmar esa fecha.'}</p>
      <ul className="mt-2 list-disc pl-5">
        {resultado.conflictos.map((evento) => (
          <li key={evento.id}>
            {formatearFecha(evento.fecha)} · {formatearHorario(evento)} · {evento.cliente.nombre}{evento.lugar ? ` · ${evento.lugar}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
