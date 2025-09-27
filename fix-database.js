const { Client } = require('pg');

// Database connection configuration
const client = new Client({
  connectionString: 'postgresql://postgres:MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd@metro.proxy.rlwy.net:56048/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDatabase() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to the database');

    // Execute the ALTER TABLE command to add the missing column
    const query = 'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP;';
    await client.query(query);
    
    console.log('Successfully added last_login_date column to users table');
    console.log('The login issue should now be fixed!');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_login_date'
    `);
    
    if (result.rows.length > 0) {
      console.log('Verification: last_login_date column exists with data type:', result.rows[0].data_type);
    }

  } catch (error) {
    console.error('Error fixing database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the fix
fixDatabase();