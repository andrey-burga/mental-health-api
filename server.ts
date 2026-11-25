import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pool } from './src/db/index.js';
import { seedDatabase } from './src/db/seed.js';
import { articlesRouter } from './src/routes/articles.js';
import { authRouter } from './src/routes/auth.js';
import { diariesRouter } from './src/routes/diaries.js';
import { disordersRouter } from './src/routes/disorders.js';
import { habitsRouter } from './src/routes/habits.js';
import { reflectionsRouter } from './src/routes/reflections.js';
import { sessionsRouter } from './src/routes/sessions.js';
import { testimonialsRouter } from './src/routes/testimonials.js';
import { usersRouter } from './src/routes/users.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

function normalizeOrigin(value: string): string {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/+$/, '');
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://mental-health-git-main-soyandrey20s-projects.vercel.app',
  ...(process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ]
    : []),
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map(normalizeOrigin)
      .filter(Boolean)
  : [];

const allowedOrigins = new Set<string>([
  ...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin),
  ...envAllowedOrigins,
]);

class CorsForbiddenError extends Error {
  statusCode = 403;
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.has(normalized)) {
      callback(null, true);
      return;
    }
    callback(new CorsForbiddenError('Origen no permitido por CORS'));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { detail: 'Demasiadas peticiones. Intenta nuevamente en un minuto.' },
});

app.use('/api', globalApiLimiter);

app.get('/', (_req, res) => {
  res.json({
    title: 'Mental Health API',
    description: 'API de soporte y divulgación sobre salud mental',
    version: '1.0.0',
    status: 'ok',
    health: '/health',
    endpoints: [
      '/api/auth',
      '/api/articles',
      '/api/disorders',
      '/api/testimonials',
      '/api/diaries',
      '/api/reflections',
      '/api/sessions',
      '/api/habits',
      '/api/users',
    ],
  });
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'mental-health-api',
      database: 'connected',
    });
  } catch (err) {
    console.error('[Healthcheck] PostgreSQL error:', err);
    res.status(503).json({
      status: 'error',
      service: 'mental-health-api',
      database: 'disconnected',
    });
  }
});

app.use('/api/articles', articlesRouter);
app.use('/api/disorders', disordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/diaries', diariesRouter);
app.use('/api/reflections', reflectionsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/users', usersRouter);

app.use((_req, res) => {
  res.status(404).json({ detail: 'Ruta no encontrada' });
});

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof CorsForbiddenError) {
      res.status(403).json({ detail: err.message });
      return;
    }

    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400
    ) {
      res.status(400).json({ detail: 'JSON inválido en el cuerpo de la petición' });
      return;
    }

    console.error('[API Error]', err);
    res.status(500).json({ detail: 'Error interno del servidor' });
  }
);

async function startServer(): Promise<void> {
  if (process.env.SEED_ON_BOOT !== 'false') {
    try {
      await seedDatabase();
      console.log('[Seed] Datos iniciales verificados en PostgreSQL.');
    } catch (err: unknown) {
      const pgCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : undefined;

      if (pgCode === '42P01') {
        console.warn(
          '[Seed] Las tablas aún no existen en PostgreSQL. Ejecuta "npm run db:push" (o configúralo como Pre-Deploy Command en Render) para crear el esquema.'
        );
      } else {
        console.error(
          '[Seed] No se pudo ejecutar seedDatabase() al iniciar:',
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mental Health API listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] Recibida señal ${signal}, cerrando conexiones...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void startServer();
