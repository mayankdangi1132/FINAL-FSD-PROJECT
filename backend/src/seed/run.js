// npm run seed — resets the database to the demo data.
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seedDatabase.js';
import { DEMO_PASSWORD } from './demoData.js';

try {
  await connectDB();
  const counts = await seedDatabase();
  console.log(`🌱 Demo data loaded: ${counts.menu} menu items, ${counts.orders} orders, ${counts.reservations} reservations, ${counts.users} users.`);
  console.log(`   Demo password for every account: ${DEMO_PASSWORD}`);
} catch (err) {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
