import { api } from './api.js';

export const listar = () => api.get('/inventario');
export const crear = (datos) => api.post('/inventario', datos);
export const actualizar = (id, datos) => api.put(`/inventario/${id}`, datos);
export const eliminar = (id) => api.delete(`/inventario/${id}`);
export const consultarDisponibilidad = (solicitudId) =>
  api.get(`/inventario/disponibilidad?${new URLSearchParams({ solicitudId })}`);
export const reservar = (inventarioId, solicitudId, cantidad) =>
  api.post(`/inventario/${inventarioId}/reservas`, { solicitudId, cantidad });
export const reducirReserva = (inventarioId, solicitudId, cantidad = 1) =>
  api.patch(`/inventario/${inventarioId}/reservas/reducir`, { solicitudId, cantidad });
export const devolverReserva = (reservaId) =>
  api.patch(`/inventario/reservas/${reservaId}/devolucion`);
export const listarVehiculos = () => api.get('/inventario/vehiculos');
export const crearVehiculo = (datos) => api.post('/inventario/vehiculos', datos);
export const actualizarVehiculo = (id, datos) => api.put(`/inventario/vehiculos/${id}`, datos);
export const consultarDisponibilidadVehiculos = (solicitudId) =>
  api.get(`/inventario/vehiculos/disponibilidad?${new URLSearchParams({ solicitudId })}`);
export const reservarVehiculo = (vehiculoId, solicitudId) =>
  api.post(`/inventario/vehiculos/${vehiculoId}/reservas`, { solicitudId });