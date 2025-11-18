// Test script to check generic match finding
const { findNextUpcomingMatch } = require('./services/apiFootballService');
require('dotenv').config();

async function testGenericMatches() {
  console.log('🧪 Testing generic match finding...');
  
  try {
    console.log('1. Finding next upcoming match...');
    const nextMatch = await findNextUpcomingMatch();
    
    if (!nextMatch) {
      console.log('❌ No upcoming matches found at all');
      return;
    }
    
    console.log('✅ Found upcoming match:');
    console.log(`   Match: ${nextMatch.teams.home.name} vs ${nextMatch.teams.away.name}`);
    console.log(`   League: ${nextMatch.league.name}`);
    console.log(`   Date: ${new Date(nextMatch.fixture.date).toLocaleString()}`);
    console.log(`   Match ID: ${nextMatch.fixture.id}`);
    
    console.log('✅ Generic match finding test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing generic match finding:', error.message);
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }
  }
}

testGenericMatches();