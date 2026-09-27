import * as cambioServicioService from '../services/cambioServicio.service.js';

export async function listar(req, res, next) {
  try {
    const estado = String(req.query.estado || '').trim() || undefined;
    res.json(await cambioServicioService.listar({ estado }));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await cambioServicioService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await cambioServicioService.crear(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function aprobar(req, res, next) {
  try {
    res.json(await cambioServicioService.aprobar(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function rechazar(req, res, next) {
  try {
    res.json(await cambioServicioService.rechazar(req.params.id));
  } catch (error) {
    next(error);
  }
}
