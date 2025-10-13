require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkEventOutcomes() {
  try {
    const res = await pool.query(`
      SELECT eo.id, eo.result, eo.points_awarded, u.username 
      FROM event_outcomes eo 
      JOIN participants p ON eo.participant_id = p.id 
      JOIN users u ON p.user_id = u.id 
      WHERE p.event_id = 24
    `);
    console.log('Event outcomes for event 24:');
    res.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.result} (${row.points_awarded} points)`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkEventOutcomes();