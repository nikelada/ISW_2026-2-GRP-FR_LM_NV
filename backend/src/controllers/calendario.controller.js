import * as calendarioService from '../services/calendario.service.js';

export async function listar(req, res, next) {
  try {
    res.json(await calendarioService.listarEventos(req.consulta.desde, req.consulta.hasta));
  } catch (error) {
    next(error);
  }
}

export async function disponibilidad(req, res, next) {
  try {
    res.json(await calendarioService.consultarDisponibilidad(req.consulta));
  } catch (error) {
    next(error);
  }
}

export async function validarFecha(req, res, next) {
  try {
    res.json(await calendarioService.validarFechaSolicitud(req.params.id));
  } catch (error) {
    next(error);
  }
}
