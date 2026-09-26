import { api } from './api.js';

export const listar = (estado = '') => api.get(`/solicitudes${estado ? `?estado=${estado}` : ''}`);
export const crear = (datos) => api.post('/solicitudes', datos);
export const actualizar = (id, datos) => api.put(`/solicitudes/${id}`, datos);
