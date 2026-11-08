import AlternativasDisponibles from './AlternativasDisponibles.jsx';
import { formatearFecha, formatearHorario } from '../utils/fechas.js';

// Al hacer clic se despliegan los datos del evento con el que se choca
function EventoEnConflicto({ evento }) {
  const datos = [
    ['Cliente', evento.cliente.nombre],
    ['Tipo de evento', evento.tipoEvento],
    ['Horario', formatearHorario(evento)],
    ['Lugar', evento.lugar],
    ['Personas', evento.cantidadPersonas],
    ['Requerimientos', evento.requerimientosTecnicos]
  ];
  return (
    <li>
      <details className="rounded bg-white/70 px-2.5 py-1.5 text-stone-800" data-conflicto={evento.id}>
        <summary className="cursor-pointer">
          {formatearFecha(evento.fecha)} · {formatearHorario(evento)} · {evento.cliente.nombre}
        </summary>
        <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-2 gap-y-1 text-xs">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="contents">
              <dt className="text-stone-500">{etiqueta}</dt>
              <dd className="font-medium">{valor || '—'}</dd>
            </div>
          ))}
        </dl>
        <a className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:underline" href={`#/solicitudes?id=${evento.id}`}>
          Ver solicitud completa →
        </a>
      </details>
    </li>
  );
}

// Muestra si la fecha y hora están disponibles o con qué chocan
// Si le pasan consulta y onElegir, cuando hay conflicto deja buscar alternativas
export default function ResultadoDisponibilidad({ resultado, consulta, textoElegir, onElegir }) {
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
      <strong>Fecha y horario no disponibles</strong>
      <p className="mt-1.5">{resultado.message || 'El horario se superpone con un evento confirmado.'}</p>
      <ul className="mt-2 grid gap-1.5">
        {resultado.conflictos.map((evento) => <EventoEnConflicto key={evento.id} evento={evento} />)}
      </ul>
      {consulta && onElegir && (
        <AlternativasDisponibles
          key={`${consulta.fecha}-${consulta.horaInicio}-${consulta.horaFin}`}
          consulta={consulta}
          textoElegir={textoElegir}
          onElegir={onElegir}
        />
      )}
    </div>
  );
}
