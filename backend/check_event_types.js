// Simple script to check if event types are properly seeded
const knex = require('knex');
const knexConfig = require('./knexfile');

// Use development configuration
const db = knex(knexConfig.development);

async function checkEventTypes() {
  try {
    console.log('Checking event types in database...');
    
    const result = await db.raw('SELECT * FROM event_types');
    const eventTypes = result.rows || result; // Handle both PG and SQLite
    
    console.log('Event types found:', eventTypes);
    
    if (eventTypes.length === 0) {
      console.log('❌ No event types found in database!');
      console.log('This could be causing the "Event type not found" errors.');
    } else {
      console.log('✅ Event types are properly seeded');
    }
    
    // Check if we have both 'prediction' and 'tournament' types
    const predictionType = eventTypes.find(et => et.name === 'prediction');
    const tournamentType = eventTypes.find(et => et.name === 'tournament');
    
    if (!predictionType) {
      console.log('❌ "prediction" event type not found');
    } else {
      console.log('✅ "prediction" event type found');
    }
    
    if (!tournamentType) {
      console.log('❌ "tournament" event type not found');
    } else {
      console.log('✅ "tournament" event type found');
    }
    
  } catch (error) {
    console.error('Error checking event types:', error);
  } finally {
    await db.destroy();
  }
}

checkEventTypes();