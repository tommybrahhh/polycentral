// Test script to verify admin API endpoints work correctly
const http = require('http');

const BASE_URL = 'http://localhost:8080';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcyODk4MDgwMCwiZXhwIjoxNzI5NTg1NjAwfQ.YourTestTokenHere'; // This would need to be a valid admin token

async function testAdminEndpoints() {
  console.log('🧪 Testing Admin API Endpoints...');
  
  try {
    // Test 1: Get admin metrics
    console.log('1. Testing /api/admin/metrics endpoint...');
    const metricsResponse = await makeRequest('/api/admin/metrics', 'GET', null, ADMIN_TOKEN);
    
    if (metricsResponse.statusCode === 200) {
      console.log('✅ /api/admin/metrics endpoint works correctly');
      console.log('   Metrics data:', JSON.stringify(metricsResponse.data, null, 2));
    } else if (metricsResponse.statusCode === 401 || metricsResponse.statusCode === 403) {
      console.log('⚠️  Admin authentication required - need valid admin token');
      console.log('   Response:', metricsResponse.statusCode, metricsResponse.data);
    } else {
      console.log('❌ /api/admin/metrics endpoint failed:', metricsResponse.statusCode, metricsResponse.data);
    }
    
    // Test 2: Get admin events
    console.log('\n2. Testing /api/admin/events endpoint...');
    const eventsResponse = await makeRequest('/api/admin/events', 'GET', null, ADMIN_TOKEN);
    
    if (eventsResponse.statusCode === 200) {
      console.log('✅ /api/admin/events endpoint works correctly');
      console.log('   Events data:', JSON.stringify(eventsResponse.data, null, 2));
    } else if (eventsResponse.statusCode === 401 || eventsResponse.statusCode === 403) {
      console.log('⚠️  Admin authentication required - need valid admin token');
      console.log('   Response:', eventsResponse.statusCode, eventsResponse.data);
    } else {
      console.log('❌ /api/admin/events endpoint failed:', eventsResponse.statusCode, eventsResponse.data);
    }
    
    // Test 3: Test without authentication
    console.log('\n3. Testing without authentication...');
    const noAuthResponse = await makeRequest('/api/admin/metrics', 'GET');
    
    if (noAuthResponse.statusCode === 401 || noAuthResponse.statusCode === 403) {
      console.log('✅ Authentication required as expected:', noAuthResponse.statusCode);
    } else {
      console.log('❌ Expected authentication requirement but got:', noAuthResponse.statusCode);
    }
    
    console.log('\n🎉 Admin endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Admin endpoint test failed:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null, token = null) {
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
    
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }
    
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

// Test if server is running
async function checkServerStatus() {
  try {
    const response = await makeRequest('/api/health');
    if (response.statusCode === 200) {
      console.log('✅ Server is running and responding');
      return true;
    }
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Checking server status...');
  const serverRunning = await checkServerStatus();
  
  if (serverRunning) {
    await testAdminEndpoints();
  } else {
    console.log('Please start the server first with: npm run dev');
  }
}

runTests();