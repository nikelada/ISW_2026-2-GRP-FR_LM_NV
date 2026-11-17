import * as tipoEventoService from '../services/tipoEvento.service.js';

export async function listar(req, res, next) {
  try {
    res.json(await tipoEventoService.listar());
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await tipoEventoService.crear(req.body));
  } catch (error) {
    next(error);
  }
}
