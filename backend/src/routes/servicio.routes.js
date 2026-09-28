import { Router } from 'express';
import * as servicioController from '../controllers/servicio.controller.js';
import * as cambioServicioController from '../controllers/cambioServicio.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { autorizarRol, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';
import {
  validarActualizacionServicio,
  validarCambioServicio,
  validarServicio
} from '../middlewares/servicio.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/', servicioController.listar);
router.get('/:id', validarId, servicioController.obtener);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarServicio, servicioController.crear);
router.post(
  '/:id/cambios',
  autorizarRol(ROLES_PRODUCCION),
  validarId,
  validarCambioServicio,
  cambioServicioController.crear
);
router.put(
  '/:id',
  autorizarRol(ROLES_PRODUCCION),
  validarId,
  validarActualizacionServicio,
  servicioController.actualizar
);

export default router;
