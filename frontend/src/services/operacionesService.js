import { api } from './api.js';

export const listarEventos = () => api.get('/operaciones/eventos');
export const obtenerOperacion = (id) => api.get(`/operaciones/eventos/${id}`);
export const listarRecursos = () => api.get('/operaciones/recursos');
export const crearRecurso = (datos) => api.post('/operaciones/recursos', datos);
export const actualizarRecurso = (id, datos) => api.put(`/operaciones/recursos/${id}`, datos);
export const consultarDisponibilidad = (consulta) =>
  api.get(`/operaciones/recursos/disponibilidad?${new URLSearchParams(consulta)}`);
export const reservarRecurso = (eventoId, recursoId) =>
  api.post(`/operaciones/eventos/${eventoId}/reservas`, { recursoId });
export const devolverRecurso = (reservaId) =>
  api.patch(`/operaciones/reservas/${reservaId}/devolucion`);
export const listarContactos = () => api.get('/operaciones/personal/contactos');
export const asignarPersonal = (eventoId, datos) =>
  api.post(`/operaciones/eventos/${eventoId}/personal`, datos);
export const quitarPersonal = (asignacionId) =>
  api.delete(`/operaciones/asignaciones-personal/${asignacionId}`);
export const crearTarea = (eventoId, datos) =>
  api.post(`/operaciones/eventos/${eventoId}/tareas`, datos);
export const alternarTarea = (tareaId) => api.patch(`/operaciones/tareas/${tareaId}`);
export const crearPago = (eventoId, datos) =>
  api.post(`/operaciones/eventos/${eventoId}/pagos`, datos);
export const alternarPago = (pagoId) => api.patch(`/operaciones/pagos/${pagoId}`);
export const solicitarCierre = (eventoId, encuesta) =>
  api.post(`/operaciones/eventos/${eventoId}/cierre`, encuesta);
export const aprobarCierre = (eventoId) =>
  api.post(`/operaciones/eventos/${eventoId}/aprobar-cierre`);
