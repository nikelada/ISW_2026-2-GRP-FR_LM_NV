import { api } from './api.js';

export const listarRecursos = () => api.get('/ubicaciones/recursos');
export const crearRecurso = (datos) => api.post('/ubicaciones/recursos', datos);
export const actualizarRecurso = (id, datos) => api.put(`/ubicaciones/recursos/${id}`, datos);
export const consultarDisponibilidad = (consulta) =>
  api.get(`/ubicaciones/recursos/disponibilidad?${new URLSearchParams(consulta)}`);
export const reservarRecurso = (eventoId, recursoId) =>
  api.post(`/ubicaciones/eventos/${eventoId}/reservas`, { recursoId });
