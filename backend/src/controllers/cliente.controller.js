import * as clienteService from '../services/cliente.service.js';

export async function listar(req, res, next) {
  try {
    res.json(await clienteService.listar(String(req.query.q || '').trim()));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await clienteService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await clienteService.crear(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await clienteService.actualizar(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
