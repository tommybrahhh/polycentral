const { Client } = require('pg');
const { execSync } = require('child_process');

console.log('🚀 Starting migration validation');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  password: process.env.PGPASSWORD || ''
});

async function validateMigrations() {
  try {
    await client.connect();
    
    // Create fresh test database
    await client.query('DROP DATABASE IF EXISTS polycentral_test');
    await client.query('CREATE DATABASE polycentral_test');

    // Run migrations
    execSync('npx db-migrate up --env test -m ./migrations', { stdio: 'inherit' });
    console.log('✅ Up migrations succeeded');
    
    // Test rollback
    execSync('npx db-migrate down --env test -c 1', { stdio: 'inherit' });
    console.log('✅ Down migrations succeeded');

    // Cleanup test database
    await client.query('DROP DATABASE IF EXISTS polycentral_test');
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}
37
validateMigrations();
  console.log('🔥 All migrations validated successfully');
} catch (error) {
  console.error('❌ Migration validation failed:', error);
  process.exit(1);
}