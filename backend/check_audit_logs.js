require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAuditLogs() {
  try {
    const res = await pool.query(`
      SELECT * FROM audit_logs WHERE event_id = 24
    `);
    console.log('Audit logs for event 24:');
    res.rows.forEach(row => {
      console.log(`  Action: ${row.action}`);
      console.log(`  Details: ${row.details}`);
      console.log(`  Timestamp: ${row.created_at}`);
      console.log('---');
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkAuditLogs();