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
