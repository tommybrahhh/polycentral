// Script to test the metrics endpoint with proper authentication
const axios = require('axios');

async function testMetricsWithAuth() {
  try {
    const productionUrl = 'https://polycentral-production.up.railway.app';
    
    console.log('🔍 Testing metrics endpoint with authentication...');
    
    // First, let's try to login as an admin user
    // You'll need to replace these with actual admin credentials
    const adminCredentials = {
      identifier: 'admin', // or admin email
      password: 'adminpassword' // replace with actual admin password
    };
    
    console.log('🔑 Attempting to login as admin...');
    
    try {
      const loginResponse = await axios.post(`${productionUrl}/api/auth/login`, adminCredentials);
      const token = loginResponse.data.token;
      console.log('✅ Login successful, token obtained');
      
      // Now test the metrics endpoint with the token
      const metricsResponse = await axios.get(`${productionUrl}/api/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Metrics endpoint response:');
      console.log('Total Events:', metricsResponse.data.totalEvents);
      console.log('Active Events:', metricsResponse.data.activeEvents);
      console.log('Completed Events:', metricsResponse.data.completedEvents);
      console.log('Total Fees:', metricsResponse.data.totalFees);
      console.log('Pending Events:', metricsResponse.data.pendingEvents);
      
      // Check if pendingEvents is 0 (which would explain why the button doesn't show)
      if (metricsResponse.data.pendingEvents === 0) {
        console.log('ℹ️  Pending events is 0 - this explains why the resolve button is not showing');
      } else {
        console.log('ℹ️  Pending events is greater than 0 - the button should be visible');
      }
      
    } catch (loginError) {
      if (loginError.response) {
        console.log('❌ Login failed with status:', loginError.response.status);
        console.log('Response data:', loginError.response.data);
      } else {
        console.log('❌ Login failed:', loginError.message);
      }
      
      // If login fails, let's try to create a test admin user first
      console.log('🔄 Attempting to create a test admin user...');
      try {
        const testAdmin = {
          username: 'testadmin',
          email: 'testadmin@example.com',
          password: 'TestAdmin123!'
        };
        
        const registerResponse = await axios.post(`${productionUrl}/api/auth/register`, testAdmin);
        console.log('✅ Test admin user created:', registerResponse.data);
        
        // Now try to login with the test admin
        const testLoginResponse = await axios.post(`${productionUrl}/api/auth/login`, {
          identifier: testAdmin.username,
          password: testAdmin.password
        });
        
        const token = testLoginResponse.data.token;
        console.log('✅ Test admin login successful');
        
        // Test metrics with test admin token
        const metricsResponse = await axios.get(`${productionUrl}/api/admin/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Metrics endpoint response with test admin:');
        console.log('Total Events:', metricsResponse.data.totalEvents);
        console.log('Active Events:', metricsResponse.data.activeEvents);
        console.log('Completed Events:', metricsResponse.data.completedEvents);
        console.log('Total Fees:', metricsResponse.data.totalFees);
        console.log('Pending Events:', metricsResponse.data.pendingEvents);
        
      } catch (registerError) {
        console.log('❌ Failed to create test admin:', registerError.response?.data || registerError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing metrics with auth:', error.message);
  }
}

testMetricsWithAuth();