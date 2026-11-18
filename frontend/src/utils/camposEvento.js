import { formatearFecha } from './fechas.js';

// Campos que se pueden pedir cambiar en un evento confirmado
export const CAMPOS_EVENTO = [
  { campo: 'tipoEvento', etiqueta: 'Tipo de evento', tipo: 'tipoEvento' },
  { campo: 'fecha', etiqueta: 'Fecha', tipo: 'date' },
  { campo: 'horaInicio', etiqueta: 'Hora de inicio', tipo: 'time' },
  { campo: 'horaFin', etiqueta: 'Hora de término', tipo: 'time' },
  { campo: 'cantidadPersonas', etiqueta: 'Cantidad de personas', tipo: 'number' },
  { campo: 'lugar', etiqueta: 'Lugar', tipo: 'lugar' },
  { campo: 'requerimientosTecnicos', etiqueta: 'Requerimientos técnicos', tipo: 'textarea' }
];

// Datos de un cambio que se muestran
export const camposCambiados = (cambios) => Object.keys(cambios).filter((campo) => campo !== 'espacioId');

export function etiquetaCampo(campo) {
  return CAMPOS_EVENTO.find((c) => c.campo === campo)?.etiqueta || campo;
}

export function formatearValor(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return campo === 'fecha' ? formatearFecha(String(valor)) : String(valor);
}
