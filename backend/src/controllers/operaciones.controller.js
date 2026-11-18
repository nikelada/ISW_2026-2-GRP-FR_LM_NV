import * as operacionesService from '../services/operaciones.service.js';

const manejar = (accion) => async (req, res, next) => {
  try {
    const resultado = await accion(req);
    if (resultado === undefined) return res.status(204).end();
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

export const listarEventos = manejar(() => operacionesService.listarEventos());
export const obtenerOperacion = manejar((req) => operacionesService.obtenerOperacion(req.params.id));
export const devolverRecurso = manejar((req) => operacionesService.devolverRecurso(req.params.id));
export const listarContactos = manejar(() => operacionesService.listarContactos());
export const asignarPersonal = manejar((req) => operacionesService.asignarPersonal(req.params.id, req.body));
export const quitarPersonal = manejar(async (req) => {
  await operacionesService.quitarPersonal(req.params.id);
});
export const crearTarea = manejar((req) => operacionesService.crearTarea(req.params.id, req.body));
export const alternarTarea = manejar((req) => operacionesService.alternarTarea(req.params.id));
export const crearPago = manejar((req) => operacionesService.crearPago(req.params.id, req.body));
export const alternarPago = manejar((req) => operacionesService.alternarPago(req.params.id));
export const solicitarCierre = manejar((req) => operacionesService.solicitarCierre(req.params.id, req.body));
export const aprobarCierre = manejar((req) => operacionesService.aprobarCierre(req.params.id, req.user.id));
