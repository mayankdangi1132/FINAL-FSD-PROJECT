import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import { User } from './models/index.js';
import { seedDatabase } from './seed/seedDatabase.js';
import { DEMO_PASSWORD } from './seed/demoData.js';

async function start() {
  await connectDB();

  // First run: fill the empty database with the demo restaurant.
  if ((await User.estimatedDocumentCount()) === 0) {
    console.log('🌱 Empty database — loading demo data…');
    const counts = await seedDatabase();
    console.log(`🌱 Loaded ${counts.menu} menu items, ${counts.orders} orders, ${counts.reservations} reservations. Demo password: ${DEMO_PASSWORD}`);
  }

  const server = app.listen(env.port, () => {
    console.log(`🚀 API ready at http://localhost:${env.port}/api`);
  });
  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') console.error(`❌ Port ${env.port} is already in use. Set PORT in backend/.env or stop the other program.`);
    else console.error('❌ Server error:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    await disconnectDB().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  if (err?.code === 'EADDRINUSE') console.error(`❌ Port ${env.port} is already in use. Set PORT in backend/.env or stop the other program.`);
  else console.error('❌ Failed to start the server:', err);
  process.exit(1);
});
