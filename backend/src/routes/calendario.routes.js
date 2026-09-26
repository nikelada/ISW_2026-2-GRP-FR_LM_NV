import { Router } from 'express';
import * as calendarioController from '../controllers/calendario.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarConsultaDisponibilidad, validarRango } from '../middlewares/validarCalendario.js';
import { validarId } from '../middlewares/validarId.js';

// Todos los usuarios autenticados tienen acceso al calendario compartido.
const router = Router();
router.use(requireAuth);
router.get('/', validarRango, calendarioController.listar);
router.get('/disponibilidad', validarConsultaDisponibilidad, calendarioController.disponibilidad);
router.post('/solicitudes/:id/validar-fecha', validarId, calendarioController.validarFecha);

export default router;
