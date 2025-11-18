// backend/test_sportmonks_integration.js
// Test script for Sportmonks Football API integration

require('dotenv').config({ path: './.env.production' });
const { getNextRealMadridMatch, getRealMadridTeamId, getMatchDetails } = require('./services/sportmonksService');

async function testSportmonksIntegration() {
  console.log('🧪 Testing Sportmonks API integration...');
  console.log(`API Token: ${process.env.SPORTMONKS_API_TOKEN ? 'Set' : 'Not set'}`);
  
  try {
    // Test 1: Get Real Madrid team ID
    console.log('\n1. Testing Real Madrid team ID lookup...');
    try {
      const teamId = await getRealMadridTeamId();
      console.log(`✅ Real Madrid Team ID: ${teamId}`);
    } catch (error) {
      console.error('❌ Team ID lookup failed:', error.message);
      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
    
    // Test 2: Get next Real Madrid match
    console.log('\n2. Testing next Real Madrid match lookup...');
    const nextMatch = await getNextRealMadridMatch();
    
    if (nextMatch) {
      console.log('✅ Next Real Madrid match found:');
      console.log(`   Match: ${nextMatch.name}`);
      console.log(`   Date: ${new Date(nextMatch.starting_at).toLocaleString()}`);
      console.log(`   League: ${nextMatch.league?.name}`);
      console.log(`   Status: ${nextMatch.status}`);
    } else {
      console.log('ℹ️ No upcoming Real Madrid matches found');
    }
    
    // Test 3: Test match details (if we have a match)
    if (nextMatch) {
      console.log('\n3. Testing match details...');
      const matchDetails = await getMatchDetails(nextMatch.id);
      console.log('✅ Match details retrieved:');
      console.log(`   Participants: ${matchDetails.participants?.map(p => p.name).join(' vs ')}`);
      console.log(`   Scores: ${JSON.stringify(matchDetails.scores)}`);
    }
    
    console.log('\n🎉 Sportmonks API integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Sportmonks API test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
    }
  }
}

// Run the test
testSportmonksIntegration().catch(console.error);