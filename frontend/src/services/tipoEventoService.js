import { api } from './api.js';

export const listar = () => api.get('/tipos-evento');
export const crear = (nombre) => api.post('/tipos-evento', { nombre });
