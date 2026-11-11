import { Router } from 'express';
import * as cotizacionController from '../controllers/cotizacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarCalculo } from '../middlewares/cotizacion.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

const router = Router();
router.use(requireAuth);
router.post('/calcular', autorizarRol(ROLES_PRODUCCION), validarCalculo, cotizacionController.calcular);

export default router;
