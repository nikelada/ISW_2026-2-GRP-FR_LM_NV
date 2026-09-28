import { Router } from 'express';
import authRoutes from './auth.routes.js';
import clienteRoutes from './cliente.routes.js';
import solicitudRoutes from './solicitud.routes.js';
import calendarioRoutes from './calendario.routes.js';
import inventarioRoutes from './inventario.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.use('/solicitudes', solicitudRoutes);
router.use('/calendario', calendarioRoutes);
router.use('/inventario', inventarioRoutes);
router.get('/health', (_req, res) => res.json({ status: 'ok', database: 'connected' }));

export default router;
