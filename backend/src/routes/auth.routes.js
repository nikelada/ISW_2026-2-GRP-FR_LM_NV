import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validarLogin, validarRegistro } from '../middlewares/validarAuth.js';

const router = Router();
router.post('/login', validarLogin, login);
router.post('/register', validarRegistro, register);
router.get('/me', requireAuth, me);

export default router;
