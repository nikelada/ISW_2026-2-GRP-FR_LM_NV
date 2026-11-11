import { Router } from 'express';
import * as cotizacionController from '../controllers/cotizacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarCalculo, validarFiltros } from '../middlewares/cotizacion.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

// Consultar: cualquier usuario logueado (Producción y Gerencia). Calcular y crear: Producción.
const router = Router();
router.use(requireAuth);
router.get('/', validarFiltros, cotizacionController.listar);
router.get('/:id', validarId, cotizacionController.obtener);
router.post('/calcular', autorizarRol(ROLES_PRODUCCION), validarCalculo, cotizacionController.calcular);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarCalculo, cotizacionController.crear);

export default router;
