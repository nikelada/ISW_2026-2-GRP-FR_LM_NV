// Para mostrar las fechas (AAAA-MM-DD) y horas (HH:MM) que manda el backend
export function formatearFecha(fecha, opciones = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!fecha) return '';
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CL', opciones);
}

export function formatearHorario({ horaInicio, horaFin }) {
  if (!horaInicio && !horaFin) return '';
  return `${horaInicio || '—'} – ${horaFin || '—'}`;
}
