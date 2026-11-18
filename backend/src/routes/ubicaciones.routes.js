import { Router } from 'express';
import * as ubicacionesController from '../controllers/ubicaciones.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import {
  validarConsultaRecursos,
  validarRecurso,
  validarReserva
} from '../middlewares/operaciones.middleware.js';
import { autorizarRol, ROLES_ADMIN } from '../middlewares/rol.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/recursos', autorizarRol(ROLES_ADMIN), ubicacionesController.listarRecursos);
router.get('/recursos/disponibilidad', autorizarRol(ROLES_ADMIN), validarConsultaRecursos, ubicacionesController.consultarDisponibilidad);
router.post('/recursos', autorizarRol(ROLES_ADMIN), validarRecurso, ubicacionesController.crearRecurso);
router.put('/recursos/:id', autorizarRol(ROLES_ADMIN), validarId, validarRecurso, ubicacionesController.actualizarRecurso);
router.post('/eventos/:id/reservas', autorizarRol(ROLES_ADMIN), validarId, validarReserva, ubicacionesController.reservarRecurso);

export default router;
