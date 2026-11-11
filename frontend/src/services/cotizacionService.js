import { api } from './api.js';

export function listar({ estado = '', solicitudId = '' } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (solicitudId) params.set('solicitudId', solicitudId);
  const query = params.toString();
  return api.get(`/cotizaciones${query ? `?${query}` : ''}`);
}

export const obtener = (id) => api.get(`/cotizaciones/${id}`);

// Muestra el detalle y el total sin guardar
export const calcular = (datos) => api.post('/cotizaciones/calcular', datos);

export const crear = (datos) => api.post('/cotizaciones', datos);
