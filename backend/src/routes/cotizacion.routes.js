import { Router } from 'express';
import * as cotizacionController from '../controllers/cotizacion.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarCalculo, validarFiltros, validarRechazo, validarSolicitudModificaciones } from '../middlewares/cotizacion.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';
import { autorizarRol, ROLES_GERENCIA, ROLES_PRODUCCION } from '../middlewares/rol.middleware.js';

// Consultar: cualquier usuario con sesión (Producción y Comercial, y Gerencia). Por cotizar, calcular y crear: Producción y Comercial.
const router = Router();
router.use(requireAuth);
router.get('/', validarFiltros, cotizacionController.listar);
// Antes de '/:id' para que 'por-cotizar' no se tome como un id
router.get('/por-cotizar', autorizarRol(ROLES_PRODUCCION), cotizacionController.listarPorCotizar);
router.get('/:id', validarId, cotizacionController.obtener);
router.post('/calcular', autorizarRol(ROLES_PRODUCCION), validarCalculo, cotizacionController.calcular);
router.post('/', autorizarRol(ROLES_PRODUCCION), validarCalculo, cotizacionController.crear);
// RF-10: revisión de Gerencia
router.patch('/:id/aprobar', autorizarRol(ROLES_GERENCIA), validarId, cotizacionController.aprobar);
router.patch(
  '/:id/solicitar-modificaciones',
  autorizarRol(ROLES_GERENCIA),
  validarId,
  validarSolicitudModificaciones,
  cotizacionController.solicitarModificaciones
);
// RF-10: respuesta del cliente, la registra Producción y Comercial
router.patch('/:id/aceptar', autorizarRol(ROLES_PRODUCCION), validarId, cotizacionController.aceptar);
router.patch('/:id/rechazar', autorizarRol(ROLES_PRODUCCION), validarId, validarRechazo, cotizacionController.rechazar);

export default router;
