const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const BASE_URL = 'http://localhost:8080';
const DB_PATH = './database.json';

// Test admin credentials (you'll need to create an admin user first)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

let authToken = '';

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, url, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error making ${method} request to ${url}:`, error.response?.data || error.message);
    throw error;
  }
}

// Test the resolve functionality
async function testResolveFunctionality() {
  console.log('🧪 Testing Resolve Functionality');
  console.log('================================');

  try {
    // 1. First, login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');

    // 2. Check current metrics
    console.log('2. Checking current metrics...');
    const metrics = await makeAuthenticatedRequest('get', '/api/admin/metrics');
    console.log('📊 Current metrics:', metrics);

    // 3. Create a test event that will expire soon
    console.log('3. Creating test event...');
    const testEvent = {
      title: 'Test Event for Resolution',
      description: 'This is a test event to verify resolve functionality',
      option_a: 'Option A',
      option_b: 'Option B',
      end_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      entry_fee: 10
    };

    const eventResponse = await makeAuthenticatedRequest('post', '/api/admin/events', testEvent);
    console.log('✅ Test event created:', eventResponse);

    // 4. Wait for event to expire
    console.log('4. Waiting for event to expire (5 minutes)...');
    console.log('⏰ Event will expire at:', testEvent.end_time);
    console.log('⏰ Current time:', new Date().toISOString());
    
    // For testing, we'll manually update the event to expired status
    const db = new sqlite3.Database(DB_PATH);
    
    // Update the event to expired status manually for testing
    db.run(
      'UPDATE events SET status = ? WHERE id = ?',
      ['expired', eventResponse.id],
      function(err) {
        if (err) {
          console.error('❌ Error updating event status:', err);
        } else {
          console.log('✅ Event status updated to expired');
        }
      }
    );

    // Wait a moment for the update to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Check metrics again - should now show pendingEvents > 0
    console.log('5. Checking metrics after event expiration...');
    const updatedMetrics = await makeAuthenticatedRequest('get', '/api/admin/metrics');
    console.log('📊 Updated metrics:', updatedMetrics);

    if (updatedMetrics.pendingEvents > 0) {
      console.log('✅ Pending events detected! Resolve button should appear');
      
      // 6. Test the resolve endpoint
      console.log('6. Testing resolve endpoint...');
      const resolveResponse = await makeAuthenticatedRequest(
        'post', 
        `/api/admin/events/${eventResponse.id}/resolve`,
        { winning_option: 'option_a' }
      );
      console.log('✅ Resolve successful:', resolveResponse);

      // 7. Verify metrics after resolution
      console.log('7. Verifying metrics after resolution...');
      const finalMetrics = await makeAuthenticatedRequest('get', '/api/admin/metrics');
      console.log('📊 Final metrics:', finalMetrics);

      if (finalMetrics.pendingEvents === 0) {
        console.log('✅ Success! Pending events resolved to 0');
      } else {
        console.log('❌ Pending events not cleared:', finalMetrics.pendingEvents);
      }
    } else {
      console.log('❌ No pending events detected');
    }

    db.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if we can run this test
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  try {
    // Check if server is running
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running');

    // Check if admin user exists
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
      console.log('✅ Admin user exists');
      return true;
    } catch (loginError) {
      console.log('ℹ️ Admin user does not exist or credentials are wrong');
      console.log('💡 Please create an admin user with email: admin@example.com, password: admin123');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Please start the server with: npm run dev (in backend directory)');
    return false;
  }
}

// Main execution
async function main() {
  const canRun = await checkPrerequisites();
  if (canRun) {
    await testResolveFunctionality();
  } else {
    console.log('\n📋 To run this test:');
    console.log('1. Start the backend server: cd backend && npm run dev');
    console.log('2. Ensure an admin user exists with email: admin@example.com, password: admin123');
    console.log('3. Run this script again');
  }
}

main();