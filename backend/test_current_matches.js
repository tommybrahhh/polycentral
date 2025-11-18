// Test script to check current matches available in API-Football
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

async function testCurrentMatches() {
  console.log('🔍 Checking current matches in API-Football...');
  
  try {
    // Check live matches
    console.log('1. Checking live matches...');
    const liveResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        live: 'all',
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    if (liveResponse.data.response && liveResponse.data.response.length > 0) {
      console.log(`✅ Live matches found: ${liveResponse.data.response.length}`);
      liveResponse.data.response.forEach(match => {
        console.log(`   ${match.teams.home.name} vs ${match.teams.away.name} (${match.fixture.status.long})`);
      });
    } else {
      console.log('ℹ️ No live matches found');
    }

    // Check matches for today
    console.log('\n2. Checking matches for today...');
    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        date: today,
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    if (todayResponse.data.response && todayResponse.data.response.length > 0) {
      console.log(`✅ Today's matches found: ${todayResponse.data.response.length}`);
      todayResponse.data.response.forEach(match => {
        const matchTime = new Date(match.fixture.date).toLocaleTimeString();
        console.log(`   ${match.teams.home.name} vs ${match.teams.away.name} at ${matchTime}`);
      });
    } else {
      console.log('ℹ️ No matches scheduled for today');
    }

    // Check matches for next 7 days
    console.log('\n3. Checking matches for next 7 days...');
    const nextWeekResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        next: 50, // Get more matches to cover 7 days
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    if (nextWeekResponse.data.response && nextWeekResponse.data.response.length > 0) {
      console.log(`✅ Upcoming matches found: ${nextWeekResponse.data.response.length}`);
      
      // Group by date
      const matchesByDate = {};
      nextWeekResponse.data.response.forEach(match => {
        const matchDate = new Date(match.fixture.date).toLocaleDateString();
        if (!matchesByDate[matchDate]) {
          matchesByDate[matchDate] = [];
        }
        matchesByDate[matchDate].push(match);
      });

      Object.entries(matchesByDate).forEach(([date, matches]) => {
        console.log(`\n   📅 ${date}:`);
        matches.forEach(match => {
          const matchTime = new Date(match.fixture.date).toLocaleTimeString();
          console.log(`      ${matchTime} - ${match.teams.home.name} vs ${match.teams.away.name}`);
        });
      });
    } else {
      console.log('ℹ️ No upcoming matches found in next 7 days');
    }

  } catch (error) {
    console.error('❌ Error checking matches:', error.message);
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }
  }
}

testCurrentMatches();