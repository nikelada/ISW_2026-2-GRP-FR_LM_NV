import * as tipoServicioService from '../services/tipoServicio.service.js';

export async function listar(req, res, next) {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    res.json(await tipoServicioService.listar({ incluirInactivos }));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await tipoServicioService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await tipoServicioService.crear(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await tipoServicioService.actualizar(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
