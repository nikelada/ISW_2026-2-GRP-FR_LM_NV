import * as solicitudService from '../services/solicitud.service.js';

export async function listar(req, res, next) {
  try {
    const estado = String(req.query.estado || '').trim() || undefined;
    const clienteId = Number(req.query.clienteId) || undefined;
    res.json(await solicitudService.listar({ estado, clienteId }));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await solicitudService.obtenerPorId(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    res.status(201).json(await solicitudService.crear(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await solicitudService.actualizar(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function agregarServicio(req, res, next) {
  try {
    res.status(201).json(await solicitudService.agregarServicio(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}
