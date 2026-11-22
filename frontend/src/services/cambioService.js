import { api } from './api.js';

export const listar = (estado = '', solicitudId = '') => {
  const query = new URLSearchParams({ ...(estado && { estado }), ...(solicitudId && { solicitudId }) }).toString();
  return api.get(`/cambios${query ? `?${query}` : ''}`);
};
export const registrar = (datos) => api.post('/cambios', datos);
export const revisar = (id, revision) => api.post(`/cambios/${id}/revision`, revision);
export const aplicar = (id) => api.post(`/cambios/${id}/aplicar`);
