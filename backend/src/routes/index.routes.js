import { Router } from 'express';
import authRoutes from './auth.routes.js';
import clienteRoutes from './cliente.routes.js';
import solicitudRoutes from './solicitud.routes.js';
import calendarioRoutes from './calendario.routes.js';
import tipoServicioRoutes from './tipoServicio.routes.js';
import servicioRoutes from './servicio.routes.js';
import cambioServicioRoutes from './cambioServicio.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.use('/solicitudes', solicitudRoutes);
router.use('/calendario', calendarioRoutes);
router.use('/tipos-servicio', tipoServicioRoutes);
router.use('/servicios', servicioRoutes);
router.use('/cambios-servicio', cambioServicioRoutes);
router.get('/health', (_req, res) => res.json({ status: 'ok', database: 'connected' }));

export default router;
