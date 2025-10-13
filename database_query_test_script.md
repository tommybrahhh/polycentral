# Database Query Test Script

This script can be used to query the database for recent events:

```javascript
// query_recent_events.js
const { Pool } = require('pg');
require('dotenv').config({path: './backend/.env'});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function queryRecentEvents() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected successfully');
    
    // Query for events created in the last 7 days
    const query = `
      SELECT id, title, start_time, end_time, status, resolution_status, created_at, initial_price
      FROM events
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
    `;
    
    console.log('Executing query...');
    const res = await client.query(query);
    
    console.log(`Found ${res.rows.length} events in the last 7 days:`);
    console.log('=====================================');
    res.rows.forEach(event => {
      console.log(`ID: ${event.id}`);
      console.log(`Title: ${event.title}`);
      console.log(`Created: ${event.created_at}`);
      console.log(`Start: ${event.start_time}`);
      console.log(`End: ${event.end_time}`);
      console.log(`Status: ${event.status}`);
      console.log(`Resolution: ${event.resolution_status}`);
      console.log(`Initial Price: $${event.initial_price}`);
      console.log('-------------------------------------');
    });
    
    // Also check total events count
    const countQuery = 'SELECT COUNT(*) as total FROM events';
    const countRes = await client.query(countQuery);
    console.log(`Total events in database: ${countRes.rows[0].total}`);
    
    // Check for event types
    const eventTypeQuery = 'SELECT * FROM event_types';
    const eventTypeRes = await client.query(eventTypeQuery);
    console.log(`Event types in database:`, eventTypeRes.rows);
    
    client.release();
  } catch (error) {
    console.error('Database query failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

queryRecentEvents();
```

To run this test:
1. Save the script as `query_recent_events.js` in the project root directory
2. Run with `node query_recent_events.js` from the project root directory

This script will show:
- All events created in the last 7 days
- Total number of events in the database
- All event types in the database