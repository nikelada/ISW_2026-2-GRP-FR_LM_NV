import { api } from './api.js';

// Espacios de Operaciones
export const listar = () => api.get('/operaciones/espacios');
