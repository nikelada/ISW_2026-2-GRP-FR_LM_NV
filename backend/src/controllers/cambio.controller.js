import * as cambioService from '../services/cambio.service.js';

export async function listar(req, res, next) {
  try {
    const estado = String(req.query.estado || '').trim() || undefined;
    const solicitudId = Number(req.query.solicitudId) || undefined;
    res.json(await cambioService.listar({ estado, solicitudId }));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await cambioService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function registrar(req, res, next) {
  try {
    res.status(201).json(await cambioService.registrar(req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export async function revisar(req, res, next) {
  try {
    res.json(await cambioService.revisar(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export async function aplicar(req, res, next) {
  try {
    res.json(await cambioService.aplicar(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
}

export async function historial(req, res, next) {
  try {
    res.json(await cambioService.historialDeEvento(req.params.id));
  } catch (error) {
    next(error);
  }
}
