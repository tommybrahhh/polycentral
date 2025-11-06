const knex = require('knex');
const knexConfig = require('./knexfile');

// Initialize Knex
const db = knex({
  ...knexConfig.development,
  connection: { filename: './database.sqlite' }
});

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const tables = await db.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    
    // SQLite returns results differently than PostgreSQL
    if (Array.isArray(tables) && tables.length > 0) {
      console.log('✅ Users table exists');
      
      // Check if users table has data
      const userCount = await db.raw('SELECT COUNT(*) as count FROM users');
      const count = Array.isArray(userCount) ? userCount[0].count : userCount[0]?.count;
      console.log(`📊 Total users: ${count}`);
      
      // Get sample users
      const users = await db.raw('SELECT id, username, points FROM users LIMIT 5');
      const userData = Array.isArray(users) ? users : users.rows || [];
      console.log('👥 Sample users:', userData);
    } else {
      console.log('❌ Users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Error details:', error);
  } finally {
    await db.destroy();
  }
}

checkDatabase();