import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST || '';
    const isUnixSocket = host.startsWith('/');
    const port = !isUnixSocket && process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined;
    const ssl =
      process.env.SQL_SSL === 'true'
        ? { rejectUnauthorized: false }
        : process.env.SQL_SSL === 'false' ||
            isUnixSocket ||
            !host ||
            host === 'localhost' ||
            host === '127.0.0.1'
          ? false
          : { rejectUnauthorized: false };

    global._postgresPool = new Pool({
      host,
      ...(port ? { port } : {}),
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      ssl,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
