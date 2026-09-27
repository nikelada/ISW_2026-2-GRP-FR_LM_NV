import { api } from './api.js';

export const listarPendientes = () => api.get('/cambios-servicio?estado=pendiente');

export const aprobar = (id) => api.patch(`/cambios-servicio/${id}/aprobar`);

export const rechazar = (id) => api.patch(`/cambios-servicio/${id}/rechazar`);
