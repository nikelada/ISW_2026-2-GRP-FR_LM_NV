import app from './app.js';
import { connectDB } from './config/prisma.js';
import { PORT } from './config/configEnv.js';
import { seedInitialUsers } from './config/initialSetup.js';

async function startServer() {
  await connectDB();
  await seedInitialUsers();
  app.listen(PORT, () => console.log(`Lumina API running at http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exit(1);
});
