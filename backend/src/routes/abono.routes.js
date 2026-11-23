import { Router } from 'express';
import * as abonoController from '../controllers/abono.controller.js';
import { validarAbono } from '../middlewares/abono.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

// RF-08: los abonos los registra Producción y Comercial
const router = Router();
router.use(requireAuth, autorizarRol(ROLES_PRODUCCION));
router.get('/', abonoController.listar);
router.post('/', validarAbono, abonoController.registrar);

export default router;
