import { Router } from 'express';
import * as cambioServicioController from '../controllers/cambioServicio.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { autorizarRol, ROLES_GERENCIA } from '../middlewares/rol.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/', cambioServicioController.listar);
router.get('/:id', validarId, cambioServicioController.obtener);
router.patch('/:id/aprobar', autorizarRol(ROLES_GERENCIA), validarId, cambioServicioController.aprobar);
router.patch('/:id/rechazar', autorizarRol(ROLES_GERENCIA), validarId, cambioServicioController.rechazar);

export default router;
