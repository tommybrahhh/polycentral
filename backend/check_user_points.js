// check_user_points.js - Check user points after event resolution
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUserPoints() {
  try {
    const res = await pool.query('SELECT id, username, points FROM users WHERE id IN (11, 12, 13)');
    console.log('User points after resolution attempt:');
    res.rows.forEach(row => {
      console.log(`User ${row.username} (ID: ${row.id}): ${row.points} points`);
    });
    
    // Also check the event status
    const eventRes = await pool.query('SELECT id, title, resolution_status, correct_answer, platform_fee FROM events WHERE id = 24');
    console.log('\nEvent status:');
    eventRes.rows.forEach(row => {
      console.log(`Event ${row.id}: ${row.title}`);
      console.log(`  Resolution status: ${row.resolution_status}`);
      console.log(`  Correct answer: ${row.correct_answer}`);
      console.log(`  Platform fee: ${row.platform_fee}`);
    });
    
    // Check event outcomes
    const outcomesRes = await pool.query(`
      SELECT eo.id, eo.result, eo.points_awarded, u.username
      FROM event_outcomes eo
      JOIN participants p ON eo.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE p.event_id = 24
    `);
    console.log('\nEvent outcomes:');
    outcomesRes.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.result} (${row.points_awarded} points)`);
    });
    
    // Check platform fees
    const feesRes = await pool.query(`
      SELECT pf.id, pf.fee_amount, u.username
      FROM platform_fees pf
      JOIN participants p ON pf.participant_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE pf.event_id = 24
    `);
    console.log('\nPlatform fees:');
    feesRes.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.fee_amount} points`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUserPoints();