import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { UPLOADS_DIR } from './controllers/menuController.js';
import { errorHandler, notFound, sanitize } from './middleware/errors.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '200kb' }));
app.use(sanitize);
// Log changes only (the dashboards poll GET endpoints every few seconds).
app.use(morgan('dev', { skip: (req) => req.method === 'GET' }));

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
app.use('/api', routes);
app.use('/api', notFound);

// In production (`npm run build` + `npm start`) the API also serves the React app.
const dist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
