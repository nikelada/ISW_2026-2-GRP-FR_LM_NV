import * as abonoClienteService from '../services/abonoCliente.service.js';

export async function listar(_req, res, next) {
  try {
    res.json(await abonoClienteService.listar());
  } catch (error) {
    next(error);
  }
}

export async function registrar(req, res, next) {
  try {
    res.status(201).json(await abonoClienteService.registrar(req.body));
  } catch (error) {
    next(error);
  }
}
