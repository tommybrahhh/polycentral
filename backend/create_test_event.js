require('dotenv').config({path: './.env'});
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTestEvent() {
  try {
    // Set end time to 1 day ago so it's ready for resolution
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    // Update event 23 to be ready for resolution
    const res = await pool.query(
      `UPDATE events 
       SET end_time = $1, resolution_status = 'pending', status = 'active'
       WHERE id = 23
       RETURNING id, title`,
      [pastDate]
    );
    
    console.log('Updated event for resolution:', res.rows[0]);
    
    // Check if the event has participants
    const participants = await pool.query(
      `SELECT COUNT(*) as count FROM participants WHERE event_id = 23`
    );
    
    console.log('Event participants count:', participants.rows[0].count);
    
    if (participants.rows[0].count === '0') {
      console.log('No participants found for event 23. Adding test participants...');
      
      // Add some test participants if needed
      // First, get some test users
      const users = await pool.query(
        `SELECT id FROM users WHERE username IN ('winner1', 'winner2', 'loser1')`
      );
      
      if (users.rows.length >= 3) {
        // Add participants
        await pool.query(
          `INSERT INTO participants (event_id, user_id, prediction, amount) VALUES 
           ($1, $2, $3, $4),
           ($1, $5, $3, $6),
           ($1, $7, $8, $9)`,
          [
            23, // event_id
            users.rows[0].id, '0-3% up', 150, // winner1
            users.rows[1].id, 250, // winner2
            users.rows[2].id, '3-5% down', 200 // loser1
          ]
        );
        console.log('Added test participants to event 23');
      } else {
        console.log('Test users not found. Please run test_pot_split.js first.');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createTestEvent();