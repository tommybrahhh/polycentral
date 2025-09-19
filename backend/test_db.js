const { Pool } = require('pg');
require('dotenv').config({ path: '.env.test' }); // Load test environment variables

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    const res = await client.query('SELECT 1');
    console.log('✅ Simple query test result:', res.rows[0]);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection error', err);
    process.exit(1);
  }
})();