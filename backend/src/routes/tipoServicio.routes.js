import { Router } from 'express';
import * as tipoServicioController from '../controllers/tipoServicio.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';
import { validarTipoServicio } from '../middlewares/tipoServicio.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/', tipoServicioController.listar);
router.get('/:id', validarId, tipoServicioController.obtener);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarTipoServicio, tipoServicioController.crear);
router.put('/:id', autorizarRol(ROLES_PRODUCCION), validarId, validarTipoServicio, tipoServicioController.actualizar);

export default router;
