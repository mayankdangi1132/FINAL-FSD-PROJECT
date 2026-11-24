import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5050,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-please-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGO_URI || '',
  localDbPort: Number(process.env.LOCAL_DB_PORT) || 27018,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
};

env.isProd = env.nodeEnv === 'production';
env.cloudinaryEnabled = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (!process.env.JWT_SECRET) {
  if (env.isProd) throw new Error('JWT_SECRET must be set in production.');
  console.warn('⚠️  JWT_SECRET not set — using a development-only secret.');
}
