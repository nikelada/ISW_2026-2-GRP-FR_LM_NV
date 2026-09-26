import { Router } from 'express';
import * as solicitudController from '../controllers/solicitud.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/autorizarRol.js';
import { validarId } from '../middlewares/validarId.js';
import { validarSolicitud } from '../middlewares/validarSolicitud.js';

const router = Router();
router.use(requireAuth);
router.get('/', solicitudController.listar);
router.get('/:id', validarId, solicitudController.obtener);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarSolicitud, solicitudController.crear);
router.put('/:id', autorizarRol(ROLES_PRODUCCION), validarId, validarSolicitud, solicitudController.actualizar);

export default router;
