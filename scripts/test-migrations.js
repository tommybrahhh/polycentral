const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

console.log('🚀 Starting migration system test');

// Database setup
const dbType = process.env.DB_TYPE || 'sqlite';
let pool;

if (dbType === 'postgres') {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('💾 PostgreSQL database connected');
} else {
  console.log('⚠️  This test is designed for PostgreSQL database');
  process.exit(1);
}

async function testMigrationSystem() {
  try {
    // Test 1: Check if schema_versions table exists
    console.log('\n📝 Test 1: Checking schema_versions table');
    const schemaVersionsTable = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'schema_versions'`
    );
    
    if (schemaVersionsTable.rows.length === 0) {
      console.log('❌ schema_versions table does not exist');
      return;
    }
    console.log('✅ schema_versions table exists');
    
    // Test 2: Check current schema version
    console.log('\n📝 Test 2: Checking current schema version');
    const currentVersion = await pool.query('SELECT MAX(version) as current FROM schema_versions');
    const version = currentVersion.rows[0].current || 0;
    console.log('✅ Current schema version:', version);
    
    // Test 3: Check if all expected tables exist
    console.log('\n📝 Test 3: Checking expected tables');
    const expectedTables = ['users', 'event_types', 'events', 'participants', 'schema_versions'];
    for (const table of expectedTables) {
      const tableExists = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_name = $1`,
        [table]
      );
      
      if (tableExists.rows.length === 0) {
        console.log(`❌ Table ${table} does not exist`);
        return;
      }
      console.log(`✅ Table ${table} exists`);
    }
    
    // Test 4: Check if required columns exist in users table
    console.log('\n📝 Test 4: Checking users table columns');
    const requiredUserColumns = ['id', 'email', 'username', 'password_hash', 'points', 'last_claimed'];
    for (const column of requiredUserColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length === 0) {
        console.log(`❌ Column ${column} does not exist in users table`);
        return;
      }
      console.log(`✅ Column ${column} exists in users table`);
    }
    
    // Test 5: Check if deprecated columns are removed from users table
    console.log('\n📝 Test 5: Checking for deprecated columns in users table');
    const deprecatedUserColumns = ['last_claim_date'];
    for (const column of deprecatedUserColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length > 0) {
        console.log(`❌ Deprecated column ${column} still exists in users table`);
        return;
      }
      console.log(`✅ Deprecated column ${column} has been removed from users table`);
    }
    
    // Test 6: Check if required columns exist in participants table
    console.log('\n📝 Test 6: Checking participants table columns');
    const requiredParticipantColumns = ['id', 'event_id', 'user_id', 'prediction', 'amount'];
    for (const column of requiredParticipantColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'participants' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length === 0) {
        console.log(`❌ Column ${column} does not exist in participants table`);
        return;
      }
      console.log(`✅ Column ${column} exists in participants table`);
    }
    
    // Test 7: Check if deprecated columns are removed from participants table
    console.log('\n📝 Test 7: Checking for deprecated columns in participants table');
    const deprecatedParticipantColumns = ['points_paid'];
    for (const column of deprecatedParticipantColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'participants' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length > 0) {
        console.log(`❌ Deprecated column ${column} still exists in participants table`);
        return;
      }
      console.log(`✅ Deprecated column ${column} has been removed from participants table`);
    }
    
    // Test 8: Check if required columns exist in events table
    console.log('\n📝 Test 8: Checking events table columns');
    const requiredEventColumns = ['id', 'title', 'description', 'crypto_symbol', 'initial_price', 'resolution_status', 'total_bets'];
    for (const column of requiredEventColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length === 0) {
        console.log(`❌ Column ${column} does not exist in events table`);
        return;
      }
      console.log(`✅ Column ${column} exists in events table`);
    }
    
    // Test 9: Check if deprecated columns are removed from events table
    console.log('\n📝 Test 9: Checking for deprecated columns in events table');
    const deprecatedEventColumns = ['cryptocurrency'];
    for (const column of deprecatedEventColumns) {
      const columnExists = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name = $1`,
        [column]
      );
      
      if (columnExists.rows.length > 0) {
        console.log(`❌ Deprecated column ${column} still exists in events table`);
        return;
      }
      console.log(`✅ Deprecated column ${column} has been removed from events table`);
    }
    
    // Test 10: Check if event_types table has the required data
    console.log('\n📝 Test 10: Checking event_types table data');
    const eventTypeExists = await pool.query(
      `SELECT id FROM event_types WHERE name = 'prediction'`
    );
    
    if (eventTypeExists.rows.length === 0) {
      console.log('❌ Event type "prediction" does not exist in event_types table');
      return;
    }
    console.log('✅ Event type "prediction" exists in event_types table');
    
    console.log('\n🎉 All migration system tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testMigrationSystem().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});