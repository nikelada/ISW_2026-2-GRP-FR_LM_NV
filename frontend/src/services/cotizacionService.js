import { api } from './api.js';

export function listar({ estado = '', solicitudId = '' } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (solicitudId) params.set('solicitudId', solicitudId);
  const query = params.toString();
  return api.get(`/cotizaciones${query ? `?${query}` : ''}`);
}

export const obtener = (id) => api.get(`/cotizaciones/${id}`);
