const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = 'http://localhost:8080';
const JWT_SECRET = '4a7d4e5f8c9b0a1d2e3f4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0';

// Function to generate admin JWT token
function generateAdminToken(userId = 1) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function testManualResolution() {
  try {
    console.log('🧪 Testing Manual Resolution Functionality\n');
    
    const adminToken = generateAdminToken(1); // Assuming user ID 1 is admin
    
    // 1. Get pending events
    console.log('1. Fetching pending events...');
    const eventsResponse = await axios.get(`${BASE_URL}/api/events`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const pendingEvents = eventsResponse.data.filter(event => event.status === 'pending');
    console.log(`   Found ${pendingEvents.length} pending events`);
    
    if (pendingEvents.length === 0) {
      console.log('   ❌ No pending events found for testing');
      return;
    }
    
    const testEvent = pendingEvents[0];
    console.log(`   Testing with event: ${testEvent.title} (ID: ${testEvent.id})`);
    
    // 2. Test manual resolution endpoint
    console.log('\n2. Testing manual resolution endpoint...');
    try {
      const resolutionResponse = await axios.post(
        `${BASE_URL}/api/admin/events/${testEvent.id}/resolve-manual`,
        {
          correct_answer: 'Higher',
          final_price: 45000
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      
      console.log('   ✅ Manual resolution successful!');
      console.log('   Response:', resolutionResponse.data);
      
      // 3. Verify event status changed
      console.log('\n3. Verifying event status...');
      const updatedEventResponse = await axios.get(`${BASE_URL}/api/events/${testEvent.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const updatedEvent = updatedEventResponse.data;
      console.log(`   New status: ${updatedEvent.status}`);
      console.log(`   Correct answer: ${updatedEvent.correct_answer}`);
      console.log(`   Final price: ${updatedEvent.final_price}`);
      
      if (updatedEvent.status === 'resolved') {
        console.log('   ✅ Event successfully resolved!');
      } else {
        console.log('   ❌ Event not resolved properly');
      }
      
    } catch (error) {
      console.log('   ❌ Manual resolution failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testManualResolution();