require('dotenv').config({path: './.env'});
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkPendingEvents() {
  try {
    const res = await pool.query(`SELECT id, title, resolution_status, end_time FROM events WHERE resolution_status = 'pending' AND end_time < NOW()`);
    console.log('Pending events:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkPendingEvents();