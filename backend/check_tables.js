// Script to check what tables exist in the database
const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.development);

async function checkTables() {
  try {
    console.log('Checking tables in database...');
    
    // For SQLite
    const result = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables found:', result);
    
    // Check if event_types table exists
    const eventTypesResult = await db.raw("SELECT * FROM sqlite_master WHERE type='table' AND name='event_types'");
    console.log('event_types table exists:', eventTypesResult.length > 0);
    
    if (eventTypesResult.length > 0) {
      const eventTypesData = await db.raw('SELECT * FROM event_types');
      console.log('Event types data:', eventTypesData);
    }
    
  } catch (error) {
    console.error('Error checking tables:', error.message);
  } finally {
    await db.destroy();
  }
}

checkTables();