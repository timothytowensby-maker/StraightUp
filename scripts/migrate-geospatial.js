const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runGeospatialMigration() {
  const client = await pool.connect();
  try {
    console.log('Running geospatial migration...');

    console.log('Enabling cube extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS cube');
    console.log('✅ cube extension enabled');

    console.log('Enabling earthdistance extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS earthdistance');
    console.log('✅ earthdistance extension enabled');

    console.log('Creating GiST index on user coordinates...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_users_location_gist ON users USING GIST (ll_to_earth(latitude, longitude))'
    );
    console.log('✅ GiST location index created');

    console.log('Creating index on share_location...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_users_share_location ON users(share_location)'
    );
    console.log('✅ share_location index created');

    console.log('Creating index on location_updated_at...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_users_location_updated ON users(location_updated_at DESC)'
    );
    console.log('✅ location_updated_at index created');

    console.log('Creating composite index on moods(user_id, expires_at)...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_moods_user_expires ON moods(user_id, expires_at DESC)'
    );
    console.log('✅ moods composite index created');

    console.log('Creating location_updates queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        processed BOOLEAN DEFAULT FALSE
      )
    `);
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_location_updates_user ON location_updates(user_id)'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_location_updates_processed ON location_updates(processed, created_at DESC)'
    );
    console.log('✅ location_updates table created');

    console.log('✅ Geospatial migration completed successfully');
  } catch (error) {
    console.error('❌ Geospatial migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runGeospatialMigration();
