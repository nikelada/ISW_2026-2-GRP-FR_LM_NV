import * as servicioService from '../services/servicio.service.js';

export async function listar(req, res, next) {
  try {
    const tipoServicioId = Number(req.query.tipoServicioId) || undefined;
    const incluirInactivos = req.query.incluirInactivos === 'true';
    res.json(await servicioService.listar({ tipoServicioId, incluirInactivos }));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await servicioService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await servicioService.crear(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await servicioService.actualizar(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
