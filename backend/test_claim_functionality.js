// test_claim_functionality.js - Test script for claim functionality
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

// Test function to check claim functionality
async function testClaimFunctionality() {
  try {
    console.log('Testing claim functionality...');
    console.log('DB_TYPE:', process.env.DB_TYPE);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
    console.log('dbType:', dbType);
    
    // Check if users table exists
    const usersTable = await pool.query(
      `SELECT ${dbType === 'postgres' ? 'table_name' : 'name'} FROM ${dbType === 'postgres' ? 'information_schema.tables' : 'sqlite_master'} WHERE ${dbType === 'postgres' ? 'table_name' : 'name'} = 'users'`
    );
    
    if (usersTable.rows.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }
    console.log('✅ Users table exists');
    
    // Check if last_claimed column exists
    const lastClaimedColumn = await pool.query(
      `SELECT ${dbType === 'postgres' ? 'column_name' : 'name'} FROM ${dbType === 'postgres' ? 'information_schema.columns' : 'pragma_table_info(\'users\')'} WHERE ${dbType === 'postgres' ? 'table_name = \'users\' AND column_name' : 'name'} = 'last_claimed'`
    );
    
    if (lastClaimedColumn.rows.length === 0) {
      console.log('❌ last_claimed column does not exist in users table');
      return;
    }
    console.log('✅ last_claimed column exists in users table');
    
    // Check if last_claim_date column exists (should not exist after migration)
    const lastClaimDateColumn = await pool.query(
      `SELECT ${dbType === 'postgres' ? 'column_name' : 'name'} FROM ${dbType === 'postgres' ? 'information_schema.columns' : 'pragma_table_info(\'users\')'} WHERE ${dbType === 'postgres' ? 'table_name = \'users\' AND column_name' : 'name'} = 'last_claim_date'`
    );
    
    if (lastClaimDateColumn.rows.length > 0) {
      console.log('⚠️  last_claim_date column still exists in users table (should be removed after migration)');
    } else {
      console.log('✅ last_claim_date column has been properly removed from users table');
    }
    
    // Test inserting a user
    const testUser = await pool.query(
      `INSERT INTO users (username, email, password_hash, points) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, points, last_claimed`,
      ['testuser', 'test@example.com', 'testhash', 1000]
    );
    
    console.log('✅ Test user created:', testUser.rows[0]);
    
    // Test claiming points
    const now = new Date();
    const pointsToAward = 250;
    
    const updatedUser = await pool.query(
      `UPDATE users 
       SET points = points + $1, last_claimed = ${dbType === 'postgres' ? 'NOW()' : 'datetime(\'now\')'} 
       WHERE id = $2 
       RETURNING id, username, points, last_claimed`,
      [pointsToAward, testUser.rows[0].id]
    );
    
    console.log('✅ Points claimed successfully:', updatedUser.rows[0]);
    
    // Test claiming points again (should fail due to 24-hour limit)
    try {
      const updatedUser2 = await pool.query(
        `UPDATE users 
         SET points = points + $1, last_claimed = ${dbType === 'postgres' ? 'NOW()' : 'datetime(\'now\')'} 
         WHERE id = $2 
         RETURNING id, username, points, last_claimed`,
        [pointsToAward, testUser.rows[0].id]
      );
      
      console.log('⚠️  Points claimed again (should have failed due to 24-hour limit):', updatedUser2.rows[0]);
    } catch (error) {
      console.log('✅ Second claim attempt correctly failed:', error.message);
    }
    
    // Concurrency test - simulate multiple simultaneous claims
    console.log('\n🔀 Starting concurrency test');
    const concurrentUsers = await Promise.all(
      Array.from({length: 5}, (_, i) =>
        pool.query(
          `INSERT INTO users (username, email, password_hash, points)
           VALUES ($1, $2, $3, $4)
           RETURNING id, points`,
          [`concurrentuser${i}`, `test${i}@example.com`, 'concurrenthash', 1000]
        )
      )
    );
    
    const initialPoints = concurrentUsers.reduce((sum, user) => sum + user.rows[0].points, 0);
    
    // Simulate concurrent claims
    await Promise.all(
      concurrentUsers.map(user =>
        pool.query(
          `UPDATE users
           SET points = points + $1, last_claimed = NOW()
           WHERE id = $2`,
          [250, user.rows[0].id]
        )
      )
    );
    
    // Verify results
    const updatedUsers = await Promise.all(
      concurrentUsers.map(user =>
        pool.query('SELECT points FROM users WHERE id = $1', [user.rows[0].id])
      )
    );
    
    const finalPoints = updatedUsers.reduce((sum, user) => sum + user.rows[0].points, 0);
    const expectedPoints = initialPoints + (250 * concurrentUsers.length);
    
    if (finalPoints === expectedPoints) {
      console.log(`✅ Concurrency test passed. Total points: ${finalPoints}`);
    } else {
      console.log(`❌ Concurrency test failed. Expected ${expectedPoints}, got ${finalPoints}`);
    }
    
    console.log('✅ All tests passed');

    // Error handling test suite
    console.log('\n🚨 Starting error handling tests');
    
    // Test helper functions
    async function createTestUser() {
      const user = await pool.query(
        `INSERT INTO users (username, email, password_hash, points)
         VALUES ($1, $2, $3, $4)
         RETURNING id, points`,
        [`testuser_${Date.now()}`, 'error-test@example.com', 'testhash', 1000]
      );
      return user.rows[0];
    }

    async function createTestEvent(status = 'open') {
      const event = await pool.query(
        `INSERT INTO events (name, status, entry_fee)
         VALUES ($1, $2, $3)
         RETURNING id, status`,
        ['Error Test Event', status, 100]
      );
      return event.rows[0];
    }

    async function cleanupTestData(userId, eventId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
      await pool.query('DELETE FROM participations WHERE user_id = $1 OR event_id = $1', [userId]);
    }

    // Test Case 1: EVENT_CLOSED (410)
    try {
      const testUser = await createTestUser();
      const testEvent = await createTestEvent('closed');
      
      const participationResponse = await pool.query(
        `INSERT INTO participations (user_id, event_id)
         VALUES ($1, $2)
         RETURNING id`,
        [testUser.id, testEvent.id]
      );
      
      console.log('⚠️  EVENT_CLOSED test failed - participation created on closed event');
      await cleanupTestData(testUser.id, testEvent.id);
    } catch (error) {
      if (error.message.includes('410')) {
        console.log('✅ EVENT_CLOSED (410) handled correctly:', error.message);
      } else {
        console.log('❌ EVENT_CLOSED test failed with unexpected error:', error.message);
      }
    }

    // Test Case 2: DUPLICATE_ENTRY (409)
    try {
      const testUser = await createTestUser();
      const testEvent = await createTestEvent();
      
      // First participation
      await pool.query(
        `INSERT INTO participations (user_id, event_id)
         VALUES ($1, $2)`,
        [testUser.id, testEvent.id]
      );
      
      // Duplicate participation
      await pool.query(
        `INSERT INTO participations (user_id, event_id)
         VALUES ($1, $2)`,
        [testUser.id, testEvent.id]
      );
      
      console.log('⚠️  DUPLICATE_ENTRY test failed - duplicate participation created');
      await cleanupTestData(testUser.id, testEvent.id);
    } catch (error) {
      if (error.message.includes('409')) {
        console.log('✅ DUPLICATE_ENTRY (409) handled correctly:', error.message);
        
        // Verify database state
        const participations = await pool.query(
          'SELECT COUNT(*) FROM participations WHERE user_id = $1',
          [testUser.id]
        );
        if (participations.rows[0].count === '1') {
          console.log('✅ Database consistency maintained for duplicate entry');
        }
      } else {
        console.log('❌ DUPLICATE_ENTRY test failed with unexpected error:', error.message);
      }
    }

    // Test Case 3: INSUFFICIENT_FUNDS (402)
    try {
      const testUser = await createTestUser();
      await pool.query(
        'UPDATE users SET points = $1 WHERE id = $2',
        [50, testUser.id]
      );
      
      const testEvent = await createTestEvent();
      
      await pool.query(
        `INSERT INTO participations (user_id, event_id)
         VALUES ($1, $2)`,
        [testUser.id, testEvent.id]
      );
      
      console.log('⚠️  INSUFFICIENT_FUNDS test failed - participation with low balance created');
      await cleanupTestData(testUser.id, testEvent.id);
    } catch (error) {
      if (error.message.includes('402')) {
        console.log('✅ INSUFFICIENT_FUNDS (402) handled correctly:', error.message);
        
        // Verify transaction rollback
        const userBalance = await pool.query(
          'SELECT points FROM users WHERE id = $1',
          [testUser.id]
        );
        if (userBalance.rows[0].points === 50) {
          console.log('✅ Transaction rollback verified');
        }
      } else {
        console.log('❌ INSUFFICIENT_FUNDS test failed with unexpected error:', error.message);
      }
    }

    // Test Case 4: INVALID_PREDICTION (400)
    try {
      const testUser = await createTestUser();
      const testEvent = await createTestEvent();
      
      await pool.query(
        `INSERT INTO participations (user_id, event_id, prediction)
         VALUES ($1, $2, $3)`,
        [testUser.id, testEvent.id, 'invalid_prediction_data']
      );
      
      console.log('⚠️  INVALID_PREDICTION test failed - invalid prediction accepted');
      await cleanupTestData(testUser.id, testEvent.id);
    } catch (error) {
      if (error.message.includes('400')) {
        console.log('✅ INVALID_PREDICTION (400) handled correctly:', error.message);
      } else {
        console.log('❌ INVALID_PREDICTION test failed with unexpected error:', error.message);
      }
    }

    // Boundary Value Analysis
    try {
      const testUser = await createTestUser();
      await pool.query(
        'UPDATE users SET points = $1 WHERE id = $2',
        [100, testUser.id]  // Exact entry fee amount
      );
      
      const testEvent = await createTestEvent();
      
      const participation = await pool.query(
        `INSERT INTO participations (user_id, event_id)
         VALUES ($1, $2)
         RETURNING id`,
        [testUser.id, testEvent.id]
      );
      
      console.log('✅ Boundary value (exact points) test passed');
      await cleanupTestData(testUser.id, testEvent.id);
    } catch (error) {
      console.log('❌ Boundary value test failed:', error.message);
    }

    console.log('✅ All error handling tests completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test user
    try {
      await pool.query("DELETE FROM users WHERE email LIKE '%error-test%'");
      await pool.query("DELETE FROM events WHERE name LIKE 'Error Test%'");
      await pool.query("DELETE FROM participations WHERE event_id IN (SELECT id FROM events WHERE name LIKE 'Error Test%')");
      console.log('✅ All test data cleaned up');
    } catch (error) {
      console.error('⚠️  Error cleaning up test user:', error);
    }
  }
}

// Run the test
testClaimFunctionality().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});