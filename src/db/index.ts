import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    'FATAL: DATABASE_URL no está configurada. Define la variable DATABASE_URL en .env (local) o en Render.'
  );
}

const isUnixSocket = databaseUrl.includes('/cloudsql/');
const requiresSsl =
  !isUnixSocket &&
  (process.env.NODE_ENV === 'production' ||
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('supabase.co'));

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
