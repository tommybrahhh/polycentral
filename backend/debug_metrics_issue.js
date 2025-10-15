// Script to debug the metrics issue by understanding what's happening
const axios = require('axios');

async function debugMetricsIssue() {
  try {
    const productionUrl = 'https://polycentral-production.up.railway.app';
    
    console.log('🔍 Debugging metrics issue...');
    console.log('================================');
    
    // Test 1: Check if the server is responding
    console.log('1. Testing server health...');
    try {
      const healthResponse = await axios.get(`${productionUrl}/api/health`);
      console.log('✅ Server health: OK');
    } catch (healthError) {
      console.log('❌ Server health check failed:', healthError.message);
      return;
    }
    
    // Test 2: Check if events endpoint is accessible
    console.log('\n2. Testing events endpoint...');
    try {
      const eventsResponse = await axios.get(`${productionUrl}/api/events/active`);
      console.log('✅ Events endpoint accessible');
      console.log('   Active events count:', eventsResponse.data.length);
      
      if (eventsResponse.data.length === 0) {
        console.log('   ℹ️  No active events found - this could explain why metrics show 0 pending events');
      } else {
        console.log('   ℹ️  Active events found - checking their status...');
        eventsResponse.data.forEach(event => {
          console.log(`   - Event ${event.id}: ${event.title} (Status: ${event.status}, Resolution: ${event.resolution_status})`);
        });
      }
    } catch (eventsError) {
      console.log('❌ Events endpoint failed:', eventsError.message);
    }
    
    // Test 3: Check if there are any events at all
    console.log('\n3. Checking if any events exist...');
    try {
      // Try to get a single event to see if the table has any data
      const testEventResponse = await axios.get(`${productionUrl}/api/events/1`);
      console.log('✅ Events table has data');
      console.log('   First event:', testEventResponse.data.title);
    } catch (eventError) {
      if (eventError.response?.status === 404) {
        console.log('❌ No events found in database - this explains the empty metrics');
        console.log('   ℹ️  The event creation cron job may not be running in production');
      } else {
        console.log('❌ Error checking events:', eventError.message);
      }
    }
    
    // Test 4: Check if we can get debug info about users
    console.log('\n4. Checking user information...');
    try {
      const usersResponse = await axios.get(`${productionUrl}/api/debug/users`);
      console.log('✅ Users found:', usersResponse.data.length);
      if (usersResponse.data.length > 0) {
        console.log('   First user:', usersResponse.data[0].username);
        
        // Check if any user is admin
        const adminUsers = usersResponse.data.filter(user => user.is_admin);
        if (adminUsers.length === 0) {
          console.log('   ❌ No admin users found - this explains why metrics endpoint requires admin access');
        } else {
          console.log('   ✅ Admin users found:', adminUsers.length);
        }
      }
    } catch (usersError) {
      console.log('❌ Users endpoint failed:', usersError.message);
    }
    
    console.log('\n================================');
    console.log('📋 DIAGNOSIS:');
    console.log('Based on the tests above, the most likely issues are:');
    console.log('1. No events exist in the production database');
    console.log('2. The daily event creation cron job may not be running');
    console.log('3. The "pendingEvents" metric is 0 because no events need resolution');
    console.log('4. This is why the "Resolve" button doesn\'t appear in the admin panel');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('1. Check if the cron jobs are running in production');
    console.log('2. Manually create an event using the admin interface');
    console.log('3. Wait for an event to end to see if it becomes "pending"');
    console.log('4. The resolve button should appear when pendingEvents > 0');
    
  } catch (error) {
    console.error('❌ Error debugging metrics issue:', error.message);
  }
}

debugMetricsIssue();