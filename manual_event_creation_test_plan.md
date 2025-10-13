# Manual Event Creation Test Plan

## Objective
Test the manual event creation endpoint to determine if events can be created manually, which will help identify if the issue is with the cron job scheduling or with the event creation process itself.

## Admin Endpoint
- URL: POST `/api/admin/events/create`
- Authentication: Requires ADMIN_API_KEY header
- Function: Manually triggers the `createDailyEvent()` function

## Test Steps (for Code Mode)

### 1. Create Test Script
When switching to code mode, create a script to test the manual event creation:

```javascript
// test_manual_event_creation.js
const axios = require('axios');
require('dotenv').config({path: './backend/.env'});

async function testManualEventCreation() {
  try {
    console.log('Testing manual event creation...');
    
    // Get the admin API key from environment variables
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      console.error('ADMIN_API_KEY not found in environment variables');
      return;
    }
    
    console.log('Using admin API key:', adminApiKey.substring(0, 10) + '...');
    
    // Make request to the admin endpoint
    const response = await axios.post(
      'http://localhost:3001/api/admin/events/create', // Adjust port as needed
      {},
      {
        headers: {
          'Authorization': `Bearer ${adminApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Manual event creation response:', response.data);
    console.log('Manual event creation test: PASSED');
  } catch (error) {
    console.error('Manual event creation test: FAILED');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.error('Stack:', error.stack);
  }
}

testManualEventCreation();
```

### 2. Expected Outcomes
- SUCCESS: Returns `{ success: true, message: "Event creation triggered successfully" }`
- FAILURE: Returns error message indicating the issue

### 3. Verification Steps
After running the test:
1. Check terminal logs for any error messages during event creation
2. Query the database to see if a new event was created
3. Check if the CoinGecko API was called successfully

### 4. Possible Issues
- Invalid ADMIN_API_KEY
- Server not running on expected port
- Network connectivity issues
- Authentication middleware issues
- Event creation function errors