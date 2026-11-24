import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let localServer = null;

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set (local MongoDB or Atlas), it is used.
 * - Otherwise a real MongoDB server is started automatically with mongodb-memory-server.
 *   Its data is stored in backend/.data/db, so it survives restarts. No install needed.
 */
export async function connectDB() {
  let uri = env.mongoUri;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(__dirname, '../../.data/db');
    fs.mkdirSync(dbPath, { recursive: true });
    const instance = { dbPath, storageEngine: 'wiredTiger', ip: '127.0.0.1' };
    console.log('🍃 Starting the built-in local MongoDB (the first run downloads MongoDB once, ~100 MB)…');
    try {
      localServer = await MongoMemoryServer.create({ instance: { ...instance, port: env.localDbPort } });
    } catch {
      localServer = await MongoMemoryServer.create({ instance });
    }
    uri = localServer.getUri('saffron_table');
    console.log(`🍃 Local MongoDB running at ${uri}`);
    console.log('   (open this URL in MongoDB Compass to browse the data)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (localServer) await localServer.stop({ doCleanup: false });
}
