// test_pot_split.js - Test script for pot split functionality
const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '.env')
});

// Database setup
const dbType = process.env.DB_TYPE || 'sqlite';
let pool;

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('💾 PostgreSQL database connected');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(':memory:'); // Use in-memory database for testing

  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // SQLite uses '?' instead of '$1, $2', so we convert them
        const sqliteQuery = text.replace(/\$\d+/g, '?');
        db.all(sqliteQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    }
  };
  console.log('💾 SQLite database connected');
}

// Test function to create a test event with participants for pot split testing
async function createTestEventForPotSplit() {
  try {
    console.log('Creating test event for pot split testing...');
    console.log('DB_TYPE:', process.env.DB_TYPE);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
    console.log('dbType:', dbType);
    
    // Check if required tables exist
    const requiredTables = ['users', 'events', 'participants', 'event_types'];
    for (const table of requiredTables) {
      const tableExists = await pool.query(
        `SELECT ${dbType === 'postgres' ? 'table_name' : 'name'} FROM ${dbType === 'postgres' ? 'information_schema.tables' : 'sqlite_master'} WHERE ${dbType === 'postgres' ? 'table_name' : 'name'} = '${table}'`
      );
      
      if (tableExists.rows.length === 0) {
        console.log(`❌ ${table} table does not exist`);
        return;
      }
      console.log(`✅ ${table} table exists`);
    }
    
    // Check if event_types table has the 'prediction' type
    const eventType = await pool.query(
      `SELECT id FROM event_types WHERE name = 'prediction'`
    );
    
    let eventTypeId;
    if (eventType.rows.length === 0) {
      // Create the prediction event type if it doesn't exist
      const newEventType = await pool.query(
        `INSERT INTO event_types (name, description) VALUES ('prediction', 'Classic prediction') RETURNING id`
      );
      eventTypeId = newEventType.rows[0].id;
      console.log('✅ Created prediction event type');
    } else {
      eventTypeId = eventType.rows[0].id;
      console.log('✅ Prediction event type exists');
    }
    
    // Create test users if they don't exist
    const testUsers = [
      { username: 'winner1', email: 'winner1@example.com', points: 2000 },
      { username: 'winner2', email: 'winner2@example.com', points: 2000 },
      { username: 'loser1', email: 'loser1@example.com', points: 2000 }
    ];
    
    const userIds = [];
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await pool.query(
        `SELECT id FROM users WHERE username = $1`,
        [userData.username]
      );
      
      if (existingUser.rows.length > 0) {
        userIds.push(existingUser.rows[0].id);
        console.log(`✅ User ${userData.username} already exists`);
      } else {
        // Create user
        const newUser = await pool.query(
          `INSERT INTO users (username, email, password_hash, points) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id`,
          [userData.username, userData.email, 'testhash', userData.points]
        );
        userIds.push(newUser.rows[0].id);
        console.log(`✅ Created user ${userData.username}`);
      }
    }
    
    // Create a test event that ended in the past (ready for resolution)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // 1 day from now
    
    // Create price range options
    const options = [
      { id: 'range_0_3_up', label: '0-3% up', value: '0-3% up' },
      { id: 'range_3_5_up', label: '3-5% up', value: '3-5% up' },
      { id: 'range_5_up', label: '>5% up', value: '>5% up' },
      { id: 'range_0_3_down', label: '0-3% down', value: '0-3% down' },
      { id: 'range_3_5_down', label: '3-5% down', value: '3-5% down' },
      { id: 'range_5_down', label: '>5% down', value: '>5% down' }
    ];
    
    // Check if test event already exists
    const existingEvent = await pool.query(
      `SELECT id FROM events WHERE title LIKE 'Test Event for Pot Split%'`
    );
    
    let eventId;
    if (existingEvent.rows.length > 0) {
      eventId = existingEvent.rows[0].id;
      console.log('✅ Test event already exists');
      
      // Update the event to ensure it's ready for resolution
      await pool.query(
        `UPDATE events 
         SET end_time = $1, resolution_status = 'pending', status = 'active'
         WHERE id = $2`,
        [pastDate, eventId]
      );
      console.log('✅ Updated existing test event to be ready for resolution');
    } else {
      // Create test event
      const testEvent = await pool.query(
        `INSERT INTO events (
          title, description, options, entry_fee, start_time, end_time,
          location, max_participants, current_participants, prize_pool,
          status, event_type_id, crypto_symbol, initial_price, resolution_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id`,
        [
          'Test Event for Pot Split Testing',
          'Test event to verify pot split functionality',
          JSON.stringify(options),
          100, // entry_fee
          pastDate, // start_time
          pastDate, // end_time (in the past so it's ready for resolution)
          'Global',
          100, // max_participants
          0, // current_participants
          0, // prize_pool
          'active',
          eventTypeId,
          'bitcoin',
          50000, // initial_price
          'pending' // resolution_status
        ]
      );
      
      eventId = testEvent.rows[0].id;
      console.log('✅ Created test event for pot split testing');
    }
    
    // Add participants to the event
    // Winner participants (will have correct predictions)
    const winnerParticipants = [
      { userId: userIds[0], prediction: '0-3% up', amount: 150 },
      { userId: userIds[1], prediction: '0-3% up', amount: 250 }
    ];
    
    // Loser participant (will have incorrect prediction)
    const loserParticipant = {
      userId: userIds[2],
      prediction: '3-5% down',
      amount: 200
    };
    
    // Clear existing participants for this event
    await pool.query(
      `DELETE FROM participants WHERE event_id = $1`,
      [eventId]
    );
    console.log('✅ Cleared existing participants for test event');
    
    // Add winner participants
    for (const participant of winnerParticipants) {
      await pool.query(
        `INSERT INTO participants (event_id, user_id, prediction, amount)
         VALUES ($1, $2, $3, $4)`,
        [eventId, participant.userId, participant.prediction, participant.amount]
      );
      console.log(`✅ Added winner participant: ${participant.userId} with ${participant.amount} points`);
    }
    
    // Add loser participant
    await pool.query(
      `INSERT INTO participants (event_id, user_id, prediction, amount)
       VALUES ($1, $2, $3, $4)`,
      [eventId, loserParticipant.userId, loserParticipant.prediction, loserParticipant.amount]
      );
    console.log(`✅ Added loser participant: ${loserParticipant.userId} with ${loserParticipant.amount} points`);
    
    // Update event participant count and total_bets
    await pool.query(
      `UPDATE events 
       SET current_participants = (
         SELECT COUNT(*) FROM participants WHERE event_id = $1
       ),
       total_bets = (
         SELECT COUNT(*) FROM participants WHERE event_id = $1
       )
       WHERE id = $1`,
      [eventId]
    );
    console.log('✅ Updated event participant count and total_bets');
    
    // Document the test setup
    console.log('\n=== TEST SETUP DOCUMENTATION ===');
    console.log('Test Event ID:', eventId);
    console.log('Event Title: Test Event for Pot Split Testing');
    console.log('Event Status: active');
    console.log('Resolution Status: pending');
    console.log('End Time:', pastDate.toISOString());
    console.log('Initial Price: $50,000');
    console.log('Correct Answer (to be determined during resolution): 0-3% up');
    console.log('');
    console.log('Participants:');
    console.log(`1. Winner 1 (User ID: ${userIds[0]}) - Prediction: 0-3% up - Bet: 150 points`);
    console.log(`2. Winner 2 (User ID: ${userIds[1]}) - Prediction: 0-3% up - Bet: 250 points`);
    console.log(`3. Loser 1 (User ID: ${userIds[2]}) - Prediction: 3-5% down - Bet: 200 points`);
    console.log('');
    console.log('Total Pot: 600 points');
    console.log('Platform Fee (5%): 30 points');
    console.log('Remaining Pot: 570 points');
    console.log('Expected Winner 1 Share: 214 points (150/400 * 570)');
    console.log('Expected Winner 2 Share: 356 points (250/400 * 570)');
    console.log('');
    console.log('To test the pot split:');
    console.log('1. Manually trigger event resolution by calling the /api/events/resolve endpoint');
    console.log('2. Check that winners receive their correct share of the pot');
    console.log('3. Verify that the points are correctly displayed in the user history');
    console.log('');
    
    console.log('✅ Test event and participants created successfully!');
    console.log('You can now test the pot split functionality by manually triggering event resolution.');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    // Close database connection
    if (dbType === 'postgres' && pool) {
      await pool.end();
    }
  }
}

// Run the test setup
createTestEventForPotSplit().then(() => {
  console.log('Test setup completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test setup failed:', error);
  process.exit(1);
});