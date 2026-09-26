import { api } from './api.js';

export const listar = (busqueda = '') => api.get(`/clientes${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ''}`);
export const crear = (datos) => api.post('/clientes', datos);
export const actualizar = (id, datos) => api.put(`/clientes/${id}`, datos);
