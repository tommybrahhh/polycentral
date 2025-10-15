// Script to check events in production database
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkEvents() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('🔍 Checking events in production database...');
    
    // Check total events
    const totalEvents = await pool.query('SELECT COUNT(*) FROM events');
    console.log('📊 Total events:', totalEvents.rows[0].count);
    
    // Check active events
    const activeEvents = await pool.query(
      'SELECT COUNT(*) FROM events WHERE resolution_status = $1',
      ['pending']
    );
    console.log('📊 Active events (pending resolution):', activeEvents.rows[0].count);
    
    // Check pending events (ended but not resolved)
    const pendingEvents = await pool.query(
      'SELECT COUNT(*) FROM events WHERE resolution_status = $1 AND end_time < NOW()',
      ['pending']
    );
    console.log('📊 Pending events (ended but not resolved):', pendingEvents.rows[0].count);
    
    // Check resolved events
    const resolvedEvents = await pool.query(
      'SELECT COUNT(*) FROM events WHERE resolution_status = $1',
      ['resolved']
    );
    console.log('📊 Resolved events:', resolvedEvents.rows[0].count);
    
    // List all events with details
    const allEvents = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        resolution_status, 
        start_time, 
        end_time,
        initial_price,
        final_price,
        correct_answer
      FROM events 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 All events:');
    allEvents.rows.forEach(event => {
      console.log(`- ID: ${event.id}, Title: ${event.title.substring(0, 50)}..., Status: ${event.status}, Resolution: ${event.resolution_status}, Start: ${event.start_time}, End: ${event.end_time}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error checking events:', error);
  }
}

checkEvents();