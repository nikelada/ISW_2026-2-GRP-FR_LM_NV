import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './routes/index.routes.js';
import { manejarErrores } from './middlewares/manejarErrores.js';

// Arma la aplicación Express, pero no la inicia.
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', router);
app.use(manejarErrores);

export default app;
