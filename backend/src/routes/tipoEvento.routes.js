import { Router } from 'express';
import * as tipoEventoController from '../controllers/tipoEvento.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';
import { validarTipoEvento } from '../middlewares/tipoEvento.middleware.js';

// Todos ven la lista, solo Producción agrega tipos
const router = Router();
router.use(requireAuth);
router.get('/', tipoEventoController.listar);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarTipoEvento, tipoEventoController.crear);

export default router;
