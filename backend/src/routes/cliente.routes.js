import { Router } from 'express';
import * as clienteController from '../controllers/cliente.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/autorizarRol.js';
import { validarCliente } from '../middlewares/validarCliente.js';
import { validarId } from '../middlewares/validarId.js';

const router = Router();
router.use(requireAuth);
router.get('/', clienteController.listar);
router.get('/:id', validarId, clienteController.obtener);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarCliente, clienteController.crear);
router.put('/:id', autorizarRol(ROLES_PRODUCCION), validarId, validarCliente, clienteController.actualizar);

export default router;
