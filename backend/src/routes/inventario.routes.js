import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { autorizarRol, ROLES_ADMIN, ROLES_GERENCIA } from '../middlewares/rol.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import {
  validarConsultaDisponibilidad,
  validarDevolucionGrupoInventario,
  validarInventario,
  validarReducirReservaInventario,
  validarReservaInventario,
  validarReservaVehiculo,
  validarVehiculo
} from '../middlewares/inventario.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/disponibilidad', autorizarRol(ROLES_GERENCIA), validarConsultaDisponibilidad, inventarioController.consultarDisponibilidad);
router.post('/:id/reservas', autorizarRol(ROLES_GERENCIA), validarId, validarReservaInventario, inventarioController.reservar);
router.patch('/:id/reservas/reducir', autorizarRol(ROLES_GERENCIA), validarId, validarReducirReservaInventario, inventarioController.reducirReserva);
router.patch('/reservas/devolucion-grupo', autorizarRol(ROLES_ADMIN), validarDevolucionGrupoInventario, inventarioController.devolverGrupo);
router.patch('/reservas/:id/devolucion', autorizarRol(ROLES_ADMIN), validarId, inventarioController.devolver);
router.get('/vehiculos', autorizarRol(ROLES_GERENCIA), inventarioController.listarVehiculos);
router.post('/vehiculos/:id/reservas', autorizarRol(ROLES_GERENCIA), validarId, validarReservaVehiculo, inventarioController.reservarVehiculo);
router.get('/vehiculos/disponibilidad', autorizarRol(ROLES_GERENCIA), validarConsultaDisponibilidad, inventarioController.consultarDisponibilidadVehiculos);
router.post('/vehiculos', autorizarRol(ROLES_GERENCIA), validarVehiculo, inventarioController.crearVehiculo);
router.put('/vehiculos/:id', autorizarRol(ROLES_GERENCIA), validarId, validarVehiculo, inventarioController.actualizarVehiculo);
router.get('/', inventarioController.listar);
router.get('/:id', validarId, inventarioController.obtener);
router.post('/', autorizarRol(ROLES_GERENCIA), validarInventario, inventarioController.crear);
router.put('/:id', autorizarRol(ROLES_GERENCIA), validarId, validarInventario, inventarioController.actualizar);
router.delete('/:id', autorizarRol(ROLES_GERENCIA), validarId, inventarioController.eliminar);

export default router;