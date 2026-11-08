import { Router } from 'express';
import * as calendarioController from '../controllers/calendario.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarConsultaDisponibilidad, validarRango } from '../middlewares/calendario.middleware.js';
import { validarId } from '../middlewares/id.middleware.js';

// El calendario lo puede ver cualquier usuario con sesión
const router = Router();
router.use(requireAuth);
router.get('/', validarRango, calendarioController.listar);
router.get('/disponibilidad', validarConsultaDisponibilidad, calendarioController.disponibilidad);
router.get('/alternativas', validarConsultaDisponibilidad, calendarioController.alternativas);
router.post('/solicitudes/:id/validar-fecha', validarId, calendarioController.validarFecha);

export default router;
