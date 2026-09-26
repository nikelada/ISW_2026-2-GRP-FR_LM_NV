import { api } from './api.js';

export const listar = (desde, hasta) => api.get(`/calendario?desde=${desde}&hasta=${hasta}`);
export const consultarDisponibilidad = ({ fecha, horaInicio, horaFin }) =>
  api.get(`/calendario/disponibilidad?${new URLSearchParams({ fecha, horaInicio, horaFin })}`);
export const validarFechaSolicitud = (id) => api.post(`/calendario/solicitudes/${id}/validar-fecha`);
