# Database Query Plan

## Objective
Query the PostgreSQL database to check if any events were created in the last 48 hours to confirm the issue.

## Database Connection Details
From the .env file:
- DB_TYPE=postgres
- DATABASE_URL=postgresql://postgres:MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd@metro.proxy.rlwy.net:56048/railway

## Query to Execute (in Code Mode)
When switching to code mode, create and run a script to query the database:

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
    
    // Query for events created in the last 48 hours
    const query = `
      SELECT id, title, start_time, end_time, status, resolution_status, created_at
      FROM events
      WHERE created_at > NOW() - INTERVAL '48 hours'
      ORDER BY created_at DESC
    `;
    
    console.log('Executing query...');
    const res = await client.query(query);
    
    console.log(`Found ${res.rows.length} events in the last 48 hours:`);
    console.log('=====================================');
    res.rows.forEach(event => {
      console.log(`ID: ${event.id}`);
      console.log(`Title: ${event.title}`);
      console.log(`Created: ${event.created_at}`);
      console.log(`Start: ${event.start_time}`);
      console.log(`End: ${event.end_time}`);
      console.log(`Status: ${event.status}`);
      console.log(`Resolution: ${event.resolution_status}`);
      console.log('-------------------------------------');
    });
    
    // Also check total events count
    const countQuery = 'SELECT COUNT(*) as total FROM events';
    const countRes = await client.query(countQuery);
    console.log(`Total events in database: ${countRes.rows[0].total}`);
    
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

## Expected Results
- If events exist: List of events with creation timestamps
- If no events exist: "Found 0 events in the last 48 hours"
- If connection fails: Error message with details

## Alternative Queries to Try
1. Check all events sorted by creation date:
   ```sql
   SELECT id, title, created_at FROM events ORDER BY created_at DESC LIMIT 10;
   ```

2. Check for any events with recent start times:
   ```sql
   SELECT id, title, start_time FROM events WHERE start_time > NOW() - INTERVAL '7 days' ORDER BY start_time DESC;