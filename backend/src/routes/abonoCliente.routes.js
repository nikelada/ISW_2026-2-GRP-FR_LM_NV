import { Router } from 'express';
import * as abonoClienteController from '../controllers/abonoCliente.controller.js';
import { validarAbonoCliente } from '../middlewares/abonoCliente.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

// RF-08: los abonos los registra Producción y Comercial
const router = Router();
router.use(requireAuth, autorizarRol(ROLES_PRODUCCION));
router.get('/', abonoClienteController.listar);
router.post('/', validarAbonoCliente, abonoClienteController.registrar);

export default router;
