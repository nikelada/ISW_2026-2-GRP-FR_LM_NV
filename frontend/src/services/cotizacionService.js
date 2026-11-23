import { api } from './api.js';

export function listar({ estado = '', solicitudId = '' } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (solicitudId) params.set('solicitudId', solicitudId);
  const query = params.toString();
  return api.get(`/cotizaciones${query ? `?${query}` : ''}`);
}

// Solicitudes registradas, con la fecha habilitada y sin cotización activa
export const listarPorCotizar = () => api.get('/cotizaciones/por-cotizar');

export const obtener = (id) => api.get(`/cotizaciones/${id}`);

// Muestra el detalle y el total sin guardar
export const calcular = (datos) => api.post('/cotizaciones/calcular', datos);

export const crear = (datos) => api.post('/cotizaciones', datos);

// RF-10: Gerencia aprueba una cotización en revisión
export const aprobar = (id) => api.patch(`/cotizaciones/${id}/aprobar`);

// RF-10: Gerencia solicita modificaciones { motivos: [...], comentario }
export const solicitarModificaciones = (id, datos) => api.patch(`/cotizaciones/${id}/solicitar-modificaciones`, datos);

// RF-10: Producción y Comercial registra que el cliente aceptó la cotización aprobada
export const aceptar = (id) => api.patch(`/cotizaciones/${id}/aceptar`);
