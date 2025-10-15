// Test script to verify event creation and resolution functionality
const http = require('http');

const BASE_URL = 'http://localhost:8080';

async function testEventFunctionality() {
  console.log('🧪 Testing Event Functionality...');
  
  try {
    // Test 1: Get active events
    console.log('1. Testing /api/events/active endpoint...');
    const activeEventsResponse = await makeRequest('/api/events/active', 'GET');
    
    if (activeEventsResponse.statusCode === 200) {
      console.log('✅ /api/events/active endpoint works correctly');
      console.log(`   Found ${activeEventsResponse.data.length} active events`);
      
      if (activeEventsResponse.data.length > 0) {
        console.log('   Sample event:', {
          id: activeEventsResponse.data[0].id,
          title: activeEventsResponse.data[0].title,
          status: activeEventsResponse.data[0].status
        });
      }
    } else {
      console.log('❌ /api/events/active endpoint failed:', activeEventsResponse.statusCode, activeEventsResponse.data);
    }
    
    // Test 2: Get event details (if there are events)
    if (activeEventsResponse.data && activeEventsResponse.data.length > 0) {
      console.log('\n2. Testing /api/events/:id endpoint...');
      const eventId = activeEventsResponse.data[0].id;
      const eventDetailsResponse = await makeRequest(`/api/events/${eventId}`, 'GET');
      
      if (eventDetailsResponse.statusCode === 200) {
        console.log('✅ /api/events/:id endpoint works correctly');
        console.log('   Event details:', {
          id: eventDetailsResponse.data.id,
          title: eventDetailsResponse.data.title,
          status: eventDetailsResponse.data.status,
          resolution_status: eventDetailsResponse.data.resolution_status
        });
      } else {
        console.log('❌ /api/events/:id endpoint failed:', eventDetailsResponse.statusCode, eventDetailsResponse.data);
      }
    }
    
    // Test 3: Test event creation (this would normally require admin auth)
    console.log('\n3. Testing event creation (will fail without admin auth)...');
    const createEventResponse = await makeRequest('/api/events', 'POST', {
      title: 'Test Event',
      description: 'Test event description',
      entry_fee: 100,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    
    if (createEventResponse.statusCode === 401 || createEventResponse.statusCode === 403) {
      console.log('✅ Event creation requires authentication as expected:', createEventResponse.statusCode);
    } else if (createEventResponse.statusCode === 201) {
      console.log('✅ Event created successfully (with valid auth)');
    } else {
      console.log('❌ Event creation failed:', createEventResponse.statusCode, createEventResponse.data);
    }
    
    console.log('\n🎉 Event functionality testing completed!');
    
  } catch (error) {
    console.error('❌ Event functionality test failed:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing event functionality endpoints...');
  await testEventFunctionality();
}

runTests();