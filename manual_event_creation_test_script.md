# Manual Event Creation Test Script

This script can be used to manually trigger event creation via the admin endpoint:

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

To run this test:
1. Save the script as `test_manual_event_creation.js` in the project root directory
2. Run with `node test_manual_event_creation.js` from the project root directory

Note: Make sure the backend server is running on port 3001 before running this test.