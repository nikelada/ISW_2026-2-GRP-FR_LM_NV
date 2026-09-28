import { api } from './api.js';

export function listar({ tipoServicioId = '', incluirInactivos = false } = {}) {
  const params = new URLSearchParams();
  if (tipoServicioId) params.set('tipoServicioId', tipoServicioId);
  if (incluirInactivos) params.set('incluirInactivos', 'true');
  const query = params.toString();
  return api.get(`/servicios${query ? `?${query}` : ''}`);
}

export const obtener = (id) => api.get(`/servicios/${id}`);

export const crear = (datos) => api.post('/servicios', datos);

export const actualizar = (id, datos) => api.put(`/servicios/${id}`, datos);

export const solicitarCambio = (id, datos) => api.post(`/servicios/${id}/cambios`, datos);
