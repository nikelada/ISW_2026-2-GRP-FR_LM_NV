import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_GERENCIA } from '../middlewares/rol.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { validarInventario } from '../middlewares/inventario.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/', inventarioController.listar);
router.get('/:id', validarId, inventarioController.obtener);
router.post('/', autorizarRol(ROLES_GERENCIA), validarInventario, inventarioController.crear);
router.put('/:id', autorizarRol(ROLES_GERENCIA), validarId, validarInventario, inventarioController.actualizar);
router.delete('/:id', autorizarRol(ROLES_GERENCIA), validarId, inventarioController.eliminar);

export default router;