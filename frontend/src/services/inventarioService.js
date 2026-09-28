import { api } from './api.js';

export const listar = () => api.get('/inventario');
export const crear = (datos) => api.post('/inventario', datos);
export const actualizar = (id, datos) => api.put(`/inventario/${id}`, datos);
export const eliminar = (id) => api.delete(`/inventario/${id}`);