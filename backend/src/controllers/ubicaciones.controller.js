import * as ubicacionesService from '../services/ubicaciones.service.js';

const manejar = (accion) => async (req, res, next) => {
  try {
    const resultado = await accion(req);
    if (resultado === undefined) return res.status(204).end();
    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

export const listarEspacios = manejar(() => ubicacionesService.listarEspacios());
export const listarRecursos = manejar(() => ubicacionesService.listarRecursos());
export const crearRecurso = manejar((req) => ubicacionesService.crearRecurso(req.body));
export const actualizarRecurso = manejar((req) => ubicacionesService.actualizarRecurso(req.params.id, req.body));
export const consultarDisponibilidad = manejar((req) => ubicacionesService.consultarDisponibilidad(req.consulta));
export const reservarRecurso = manejar((req) => ubicacionesService.reservarEspacio(req.params.id, req.body.recursoId));
