// Test script to check Real Madrid event creation
const { getNextRealMadridMatch, getRealMadridTeamId } = require('./services/apiFootballService');
require('dotenv').config();

async function testRealMadridEventCreation() {
  console.log('🧪 Testing Real Madrid event creation...');
  
  try {
    // Test API-Football connection first
    console.log('1. Testing API-Football connection...');
    const teamId = await getRealMadridTeamId();
    console.log(`✅ Real Madrid Team ID: ${teamId}`);
    
    // Get next match
    console.log('2. Getting next Real Madrid match...');
    const nextMatch = await getNextRealMadridMatch();
    
    if (!nextMatch) {
      console.log('❌ No upcoming Real Madrid matches found');
      return;
    }
    
    console.log('✅ Found next Real Madrid match:');
    console.log(`   Match: ${nextMatch.teams.home.name} vs ${nextMatch.teams.away.name}`);
    console.log(`   League: ${nextMatch.league.name}`);
    console.log(`   Date: ${new Date(nextMatch.fixture.date).toLocaleString()}`);
    console.log(`   Match ID: ${nextMatch.fixture.id}`);
    
    // Test event creation (we'll just log what would be created)
    console.log('3. Testing event creation logic...');
    const realMadridTeamId = await getRealMadridTeamId();
    const opponentName = nextMatch.teams.home.id === realMadridTeamId 
      ? nextMatch.teams.away.name 
      : nextMatch.teams.home.name;
    
    const eventTitle = `Real Madrid vs ${opponentName} - ${nextMatch.league.name}`;
    console.log(`✅ Event title would be: ${eventTitle}`);
    
    console.log('✅ Real Madrid event creation test completed successfully!');
    console.log('The system is ready to create events for Real Madrid matches.');
    
  } catch (error) {
    console.error('❌ Error testing Real Madrid event creation:', error.message);
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }
  }
}

// Run the test
testRealMadridEventCreation();