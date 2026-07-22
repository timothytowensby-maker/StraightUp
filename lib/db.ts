import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  try {
    const pool = getPool();
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error, { text, params });
    throw error;
  }
}

export async function queryOne(text: string, params?: any[]) {
  const results = await query(text, params);
  return results[0] || null;
}

export async function queryCount(text: string, params?: any[]) {
  const results = await query(text, params);
  return results[0]?.count || 0;
}
