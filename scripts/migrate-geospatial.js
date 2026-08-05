const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const statements = [
  ['Enable cube extension', 'CREATE EXTENSION IF NOT EXISTS cube'],
  ['Enable earthdistance extension', 'CREATE EXTENSION IF NOT EXISTS earthdistance'],
  [
    'Create location GiST index',
    'CREATE INDEX IF NOT EXISTS idx_users_location_gist ON users USING GIST (ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL',
  ],
  [
    'Create share_location index',
    'CREATE INDEX IF NOT EXISTS idx_users_share_location ON users(share_location)',
  ],
  [
    'Create location_updated_at index',
    'CREATE INDEX IF NOT EXISTS idx_users_location_updated ON users(location_updated_at DESC)',
  ],
  [
    'Create moods user/expires index',
    'CREATE INDEX IF NOT EXISTS idx_moods_user_expires ON moods(user_id, expires_at DESC)',
  ],
  [
    'Create location updates queue table',
    `CREATE TABLE IF NOT EXISTS location_updates (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      share_location BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMP
    )`,
  ],
  [
    'Create location updates pending index',
    'CREATE INDEX IF NOT EXISTS idx_location_updates_pending ON location_updates(processed_at, created_at DESC)',
  ],
];

async function runMigrations() {
  try {
    console.log('Running geospatial migrations...');

    for (const [label, statement] of statements) {
      console.log(`→ ${label}`);
      await pool.query(statement);
      console.log(`✓ ${label}`);
    }

    console.log('✅ Geospatial migrations completed successfully');
  } catch (error) {
    console.error('❌ Geospatial migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigrations();
