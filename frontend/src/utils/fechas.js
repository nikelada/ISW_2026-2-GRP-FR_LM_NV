// Para mostrar las fechas (AAAA-MM-DD) y horas (HH:MM) que manda el backend
export function formatearFecha(fecha, opciones = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!fecha) return '';
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CL', opciones);
}

// Primer día que se puede elegir para un evento (mañana), como AAAA-MM-DD
export function fechaMinima() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;
}

export function formatearHorario({ horaInicio, horaFin }) {
  if (!horaInicio && !horaFin) return '';
  return `${horaInicio || '—'} – ${horaFin || '—'}`;
}
