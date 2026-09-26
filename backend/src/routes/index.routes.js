import { Router } from 'express';
import authRoutes from './auth.routes.js';
import clienteRoutes from './cliente.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.get('/health', (_req, res) => res.json({ status: 'ok', database: 'connected' }));

export default router;
