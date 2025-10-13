require('dotenv').config({path: './.env'});
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkActiveEvents() {
  try {
    const res = await pool.query(`SELECT id, title, resolution_status, end_time FROM events WHERE status = 'active' ORDER BY end_time`);
    console.log('Active events:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkActiveEvents();