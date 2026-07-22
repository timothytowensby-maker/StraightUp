const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { addHours } = require('date-fns');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seedDatabase() {
  try {
    console.log('Seeding database with demo data...');

    // Create demo users
    const user1Id = uuid();
    const user2Id = uuid();
    const user3Id = uuid();

    const hashedPassword = bcrypt.hashSync('password123', 10);

    await pool.query(
      `INSERT INTO users (id, first_name, age, city, energy_traits, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7),
              ($8, $9, $10, $11, $12, $13, $14),
              ($15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT (email) DO NOTHING`,
      [
        user1Id, 'Alex', 26, 'New York', ['funny', 'direct', 'chill'], 'alex@straightup.dev', hashedPassword,
        user2Id, 'Jordan', 24, 'Los Angeles', ['creative', 'calm', 'driven'], 'jordan@straightup.dev', hashedPassword,
        user3Id, 'Casey', 25, 'Austin', ['funny', 'intense', 'chill'], 'casey@straightup.dev', hashedPassword,
      ]
    );

    // Create demo moods
    const mood1Id = uuid();
    const mood2Id = uuid();
    const mood3Id = uuid();

    await pool.query(
      `INSERT INTO moods (id, user_id, text, vibe, tags, expires_at, moderated)
       VALUES ($1, $2, $3, $4, $5, $6, $7),
              ($8, $9, $10, $11, $12, $13, $14),
              ($15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT DO NOTHING`,
      [
        mood1Id, user1Id, 'Just finished the best workout 💪', 'playful', ['fitness', 'energy'], addHours(new Date(), 24), true,
        mood2Id, user2Id, 'Coffee thoughts at midnight ☕', 'curious', ['vibes', 'late-night'], addHours(new Date(), 24), true,
        mood3Id, user3Id, 'Low key into deep conversations rn 🎤', 'flirty', ['talking', 'connection'], addHours(new Date(), 24), true,
      ]
    );

    console.log('✅ Seed data inserted successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
