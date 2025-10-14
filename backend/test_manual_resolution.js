const axios = require('axios');
const { Pool } = require('pg');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'your_admin_jwt_token_here'; // Replace with actual admin token
const TEST_EVENT_ID = 1; // Replace with actual event ID to test

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://polycentral_db_user:9FvJxhgA784lGJvr29VDIc8jz27zBTmc@dpg-d30qu1ffte5s73eoi120-a/polycentral_db'
});

async function testManualResolution() {
  try {
    console.log('🧪 Testing Manual Resolution Functionality\n');

    // 1. Get event details before resolution
    console.log('1. Fetching event details...');
    const eventResponse = await axios.get(`${BASE_URL}/api/events/${TEST_EVENT_ID}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    const event = eventResponse.data;
    console.log(`   Event: ${event.title}`);
    console.log(`   Status: ${event.status}`);
    console.log(`   Prize Pool: $${event.prize_pool}`);
    console.log(`   Participants: ${event.current_participants}`);

    // 2. Get participants and their points before resolution
    console.log('\n2. Fetching participants and points before resolution...');
    const participantsResponse = await axios.get(`${BASE_URL}/api/admin/events/${TEST_EVENT_ID}/participants`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });

    const participants = participantsResponse.data;
    console.log(`   Found ${participants.length} participants:`);
    
    const userPointsBefore = {};
    for (const participant of participants) {
      const userResponse = await axios.get(`${BASE_URL}/api/users/${participant.user_id}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      userPointsBefore[participant.user_id] = userResponse.data.points;
      console.log(`   User ${participant.user_id}: ${participant.prediction} (${participant.amount} points) -> Current points: ${userResponse.data.points}`);
    }

    // 3. Perform manual resolution
    console.log('\n3. Performing manual resolution...');
    const resolutionResponse = await axios.post(
      `${BASE_URL}/api/admin/events/${TEST_EVENT_ID}/resolve-manual`,
      {
        correctAnswer: 'Higher', // Test with Higher outcome
        finalPrice: 45000 // Example final price
      },
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      }
    );

    console.log('   Resolution successful:', resolutionResponse.data.message);

    // 4. Verify event status after resolution
    console.log('\n4. Verifying event status after resolution...');
    const updatedEventResponse = await axios.get(`${BASE_URL}/api/events/${TEST_EVENT_ID}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    
    const updatedEvent = updatedEventResponse.data;
    console.log(`   New Status: ${updatedEvent.status}`);
    console.log(`   Correct Answer: ${updatedEvent.correct_answer}`);
    console.log(`   Final Price: ${updatedEvent.final_price}`);

    // 5. Verify points redistribution
    console.log('\n5. Verifying points redistribution...');
    let totalPointsDistributed = 0;
    
    for (const participant of participants) {
      const userResponse = await axios.get(`${BASE_URL}/api/users/${participant.user_id}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      
      const pointsAfter = userResponse.data.points;
      const pointsBefore = userPointsBefore[participant.user_id];
      const pointsChange = pointsAfter - pointsBefore;
      
      console.log(`   User ${participant.user_id}:`);
      console.log(`     Before: ${pointsBefore} points`);
      console.log(`     After: ${pointsAfter} points`);
      console.log(`     Change: ${pointsChange > 0 ? '+' : ''}${pointsChange} points`);
      
      if (participant.prediction === 'Higher') {
        console.log(`     Prediction: CORRECT (Higher)`);
        if (pointsChange <= 0) {
          console.log('     ❌ ERROR: Winner should have gained points');
        } else {
          console.log('     ✅ CORRECT: Winner gained points');
          totalPointsDistributed += pointsChange;
        }
      } else {
        console.log(`     Prediction: WRONG (${participant.prediction})`);
        if (pointsChange >= 0) {
          console.log('     ❌ ERROR: Loser should have lost points or stayed same');
        } else {
          console.log('     ✅ CORRECT: Loser lost points');
        }
      }
    }

    // 6. Verify total points distribution matches prize pool
    console.log(`\n6. Verifying total points distribution: ${totalPointsDistributed} distributed vs ${event.prize_pool} prize pool`);
    if (Math.abs(totalPointsDistributed - event.prize_pool) <= 1) { // Allow for rounding differences
      console.log('   ✅ CORRECT: Total distributed points match prize pool');
    } else {
      console.log('   ❌ ERROR: Total distributed points do not match prize pool');
    }

    // 7. Check audit logs
    console.log('\n7. Checking audit logs...');
    const auditQuery = `
      SELECT action, details FROM audit_logs 
      WHERE event_id = $1 AND action LIKE '%resolve%'
      ORDER BY created_at DESC LIMIT 1
    `;
    const auditResult = await pool.query(auditQuery, [TEST_EVENT_ID]);
    
    if (auditResult.rows.length > 0) {
      console.log('   ✅ Audit log found:', auditResult.rows[0].action);
      console.log('   Details:', auditResult.rows[0].details);
    } else {
      console.log('   ❌ No audit log found for resolution');
    }

    console.log('\n🎉 Manual resolution test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  } finally {
    await pool.end();
  }
}

// Run the test
testManualResolution();