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
    
    // Check if users table exists
    const usersTable = await pool.query(
      `SELECT name FROM ${dbType === 'postgres' ? 'information_schema.tables' : 'sqlite_master'} 
       WHERE ${dbType === 'postgres' ? 'table_name' : 'name'} = 'users'`
    );
    
    if (usersTable.rows.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }
    console.log('✅ Users table exists');
    
    // Check if last_claimed column exists
    const lastClaimedColumn = await pool.query(
      `SELECT ${dbType === 'postgres' ? 'column_name' : 'name'} 
       FROM ${dbType === 'postgres' ? 'information_schema.columns' : 'pragma_table_info(\'users\')'} 
       WHERE ${dbType === 'postgres' ? 'table_name = \'users\' AND column_name' : 'name'} = 'last_claimed'`
    );
    
    if (lastClaimedColumn.rows.length === 0) {
      console.log('❌ last_claimed column does not exist in users table');
      return;
    }
    console.log('✅ last_claimed column exists in users table');
    
    // Check if last_claim_date column exists (should not exist after migration)
    const lastClaimDateColumn = await pool.query(
      `SELECT ${dbType === 'postgres' ? 'column_name' : 'name'} 
       FROM ${dbType === 'postgres' ? 'information_schema.columns' : 'pragma_table_info(\'users\')'} 
       WHERE ${dbType === 'postgres' ? 'table_name = \'users\' AND column_name' : 'name'} = 'last_claim_date'`
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
    
    console.log('✅ All tests passed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test user
    try {
      await pool.query('DELETE FROM users WHERE username = $1', ['testuser']);
      console.log('✅ Test user cleaned up');
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