// Script to test the metrics endpoint on production server
const axios = require('axios');

async function testMetricsEndpoint() {
  try {
    const productionUrl = 'https://polycentral-production.up.railway.app';
    
    console.log('🔍 Testing metrics endpoint on production server...');
    console.log(`📡 Target URL: ${productionUrl}/api/admin/metrics`);
    
    // First, let's test if the server is responding
    try {
      const healthResponse = await axios.get(`${productionUrl}/api/health`);
      console.log('✅ Health check successful:', healthResponse.data);
    } catch (healthError) {
      console.log('❌ Health check failed:', healthError.message);
      return;
    }
    
    // Now let's try to get a test token for an admin user
    // This is a test - you'll need to replace with actual admin credentials
    console.log('🔑 Attempting to get admin token...');
    
    // For testing purposes, let's try to get metrics without authentication first
    // to see what response we get
    try {
      const metricsResponse = await axios.get(`${productionUrl}/api/admin/metrics`);
      console.log('✅ Metrics endpoint response (without auth):', metricsResponse.data);
    } catch (metricsError) {
      if (metricsError.response) {
        console.log('❌ Metrics endpoint failed with status:', metricsError.response.status);
        console.log('Response data:', metricsError.response.data);
        
        if (metricsError.response.status === 401) {
          console.log('🔐 Authentication required - this is expected');
        }
      } else {
        console.log('❌ Metrics endpoint failed:', metricsError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing metrics endpoint:', error.message);
  }
}

testMetricsEndpoint();