import { Router } from 'express';
import * as cambioController from '../controllers/cambio.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_GERENCIA, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';
import { validarRevision, validarSolicitudCambio } from '../middlewares/cambio.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';

// Producción registra y aplica, gerencia aprueba o rechaza
const router = Router();
router.use(requireAuth);
router.get('/', cambioController.listar);
router.get('/:id', validarId, cambioController.obtener);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarSolicitudCambio, cambioController.registrar);
router.post('/:id/revision', autorizarRol(ROLES_GERENCIA), validarId, validarRevision, cambioController.revisar);
router.post('/:id/aplicar', autorizarRol(ROLES_PRODUCCION), validarId, cambioController.aplicar);

export default router;
