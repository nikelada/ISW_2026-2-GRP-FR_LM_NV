import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './src/routes/index.routes.js';
import { connectDB } from './src/config/configDb.js';
import { PORT } from './src/config/configEnv.js';
import { seedInitialUsers } from './src/config/initialSetup.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', router);

async function startServer() {
  await connectDB();
  await seedInitialUsers();
  app.listen(PORT, () => console.log(`Lumina API running at http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exit(1);
});
