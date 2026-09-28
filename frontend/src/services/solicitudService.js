import { api } from './api.js';

export const listar = (estado = '') => api.get(`/solicitudes${estado ? `?estado=${estado}` : ''}`);
export const crear = (datos) => api.post('/solicitudes', datos);
export const actualizar = (id, datos) => api.put(`/solicitudes/${id}`, datos);
export const agregarServicio = (solicitudId, servicioId) => api.post(`/solicitudes/${solicitudId}/servicios`, { servicioId });
export const quitarServicio = (solicitudId, servicioId) => api.delete(`/solicitudes/${solicitudId}/servicios/${servicioId}`);
