import { api } from './api.js';

export const listar = (incluirInactivos = false) =>
  api.get(`/tipos-servicio${incluirInactivos ? '?incluirInactivos=true' : ''}`);

export const crear = (datos) => api.post('/tipos-servicio', datos);

export const actualizar = (id, datos) => api.put(`/tipos-servicio/${id}`, datos);
