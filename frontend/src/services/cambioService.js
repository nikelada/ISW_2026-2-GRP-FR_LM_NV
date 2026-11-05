import { api } from './api.js';

export const listar = (estado = '') => api.get(`/cambios${estado ? `?estado=${estado}` : ''}`);
export const registrar = (datos) => api.post('/cambios', datos);
export const revisar = (id, revision) => api.post(`/cambios/${id}/revision`, revision);
export const aplicar = (id) => api.post(`/cambios/${id}/aplicar`);
export const historialDeEvento = (solicitudId) => api.get(`/solicitudes/${solicitudId}/historial`);
