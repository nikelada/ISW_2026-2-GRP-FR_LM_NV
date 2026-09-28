import * as inventarioService from '../services/inventario.service.js';

export async function listar(_req, res, next) {
  try {
    res.json(await inventarioService.listar());
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await inventarioService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await inventarioService.crear(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await inventarioService.actualizar(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function eliminar(req, res, next) {
  try {
    await inventarioService.eliminar(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}