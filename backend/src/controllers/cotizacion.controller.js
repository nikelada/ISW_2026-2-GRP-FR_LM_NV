import * as cotizacionService from '../services/cotizacion.service.js';

export async function calcular(req, res, next) {
  try {
    res.json(await cotizacionService.calcular(req.body));
  } catch (error) {
    next(error);
  }
}

export async function listar(req, res, next) {
  try {
    res.json(await cotizacionService.listar(req.filtros));
  } catch (error) {
    next(error);
  }
}

export async function listarPorCotizar(_req, res, next) {
  try {
    res.json(await cotizacionService.listarPorCotizar());
  } catch (error) {
    next(error);
  }
}

export async function aprobar(req, res, next) {
  try {
    res.json(await cotizacionService.aprobar(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
}

export async function solicitarModificaciones(req, res, next) {
  try {
    res.json(await cotizacionService.solicitarModificaciones(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export async function aceptar(req, res, next) {
  try {
    res.json(await cotizacionService.aceptar(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await cotizacionService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await cotizacionService.crear(req.body));
  } catch (error) {
    next(error);
  }
}
