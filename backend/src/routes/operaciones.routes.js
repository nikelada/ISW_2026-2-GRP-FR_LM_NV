import { Router } from 'express';
import * as operacionesController from '../controllers/operaciones.controller.js';
import * as ubicacionesController from '../controllers/ubicaciones.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import {
  validarEncuesta,
  validarPago,
  validarPersonal,
  validarTarea
} from '../middlewares/operaciones.middleware.js';
import { autorizarRol, ROLES_ADMIN, ROLES_GERENCIA, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/eventos', autorizarRol(ROLES_GERENCIA), operacionesController.listarEventos);
router.get('/eventos/:id', autorizarRol(ROLES_GERENCIA), validarId, operacionesController.obtenerOperacion);
router.get('/espacios', autorizarRol([...new Set([...ROLES_PRODUCCION, ...ROLES_GERENCIA])]), ubicacionesController.listarEspacios);
router.patch('/reservas/:id/devolucion', autorizarRol(ROLES_ADMIN), validarId, operacionesController.devolverRecurso);
router.get('/personal/contactos', autorizarRol(ROLES_ADMIN), operacionesController.listarContactos);
router.post('/eventos/:id/personal', autorizarRol(ROLES_ADMIN), validarId, validarPersonal, operacionesController.asignarPersonal);
router.delete('/asignaciones-personal/:id', autorizarRol(ROLES_ADMIN), validarId, operacionesController.quitarPersonal);
router.post('/eventos/:id/tareas', autorizarRol(ROLES_ADMIN), validarId, validarTarea, operacionesController.crearTarea);
router.patch('/tareas/:id', autorizarRol(ROLES_ADMIN), validarId, operacionesController.alternarTarea);
router.post('/eventos/:id/pagos', autorizarRol(ROLES_ADMIN), validarId, validarPago, operacionesController.crearPago);
router.patch('/pagos/:id', autorizarRol(ROLES_ADMIN), validarId, operacionesController.alternarPago);
router.post('/eventos/:id/cierre', autorizarRol(ROLES_ADMIN), validarId, validarEncuesta, operacionesController.solicitarCierre);
router.post('/eventos/:id/aprobar-cierre', autorizarRol(ROLES_GERENCIA), validarId, operacionesController.aprobarCierre);

export default router;
