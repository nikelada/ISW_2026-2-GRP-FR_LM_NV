import * as abonoService from '../services/abono.service.js';

export async function listar(_req, res, next) {
  try {
    res.json(await abonoService.listar());
  } catch (error) {
    next(error);
  }
}

export async function registrar(req, res, next) {
  try {
    res.status(201).json(await abonoService.registrar(req.body));
  } catch (error) {
    next(error);
  }
}
