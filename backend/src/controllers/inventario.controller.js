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

export async function consultarDisponibilidad(req, res, next) {
  try {
    res.json(await inventarioService.consultarDisponibilidad(req.consulta.solicitudId));
  } catch (error) {
    next(error);
  }
}

export async function reservar(req, res, next) {
  try {
    res.status(201).json(await inventarioService.reservar(
      req.reserva.solicitudId,
      req.params.id,
      req.reserva.cantidad
    ));
  } catch (error) {
    next(error);
  }
}

export async function reducirReserva(req, res, next) {
  try {
    res.json(await inventarioService.reducirReserva(req.reserva.solicitudId, req.params.id, req.reserva.cantidad));
  } catch (error) {
    next(error);
  }
}

export async function devolver(req, res, next) {
  try {
    res.json(await inventarioService.devolver(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function devolverGrupo(req, res, next) {
  try {
    res.json(await inventarioService.devolverGrupo(req.reserva.solicitudId, req.reserva.inventarioId));
  } catch (error) {
    next(error);
  }
}

export async function listarVehiculos(_req, res, next) {
  try {
    res.json(await inventarioService.listarVehiculos());
  } catch (error) {
    next(error);
  }
}

export async function crearVehiculo(req, res, next) {
  try {
    res.status(201).json(await inventarioService.crearVehiculo(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizarVehiculo(req, res, next) {
  try {
    res.json(await inventarioService.actualizarVehiculo(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function consultarDisponibilidadVehiculos(req, res, next) {
  try {
    res.json(await inventarioService.consultarDisponibilidadVehiculos(req.consulta.solicitudId));
  } catch (error) {
    next(error);
  }
}

export async function reservarVehiculo(req, res, next) {
  try {
    res.status(201).json(await inventarioService.reservarVehiculo(
      req.reserva.solicitudId,
      req.params.id
    ));
  } catch (error) {
    next(error);
  }
}