import * as cotizacionService from '../services/cotizacion.service.js';

export async function calcular(req, res, next) {
  try {
    res.json(await cotizacionService.calcular(req.body));
  } catch (error) {
    next(error);
  }
}
