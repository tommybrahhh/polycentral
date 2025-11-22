// Test script to check for Elche vs Real Madrid match tomorrow
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY || 'f4bd10a216c6c769c3f49cfa0182cc44';
const API_URL = 'https://v3.football.api-sports.io';

// Team IDs
const REAL_MADRID_ID = 541;
const ELCHE_ID = 797; // Elche CF team ID

// Use valid season for free plan
const VALID_SEASON = 2023;

async function findElcheVsRealMadridMatch() {
  console.log('🔍 Searching for Elche vs Real Madrid match...');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  
  // Calculate tomorrow's date in YYYY-MM-DD format
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  console.log(`📅 Looking for matches on: ${tomorrowFormatted}`);
  
  try {
    // Search for fixtures between Elche and Real Madrid with season parameter
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: {
        team: REAL_MADRID_ID,
        date: tomorrowFormatted,
        season: VALID_SEASON,
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 15000
    });

    console.log('✅ API Response received!');
    console.log(`Response status: ${response.status}`);
    
    if (response.data.response && response.data.response.length > 0) {
      console.log(`📊 Found ${response.data.response.length} matches for Real Madrid on ${tomorrowFormatted}:`);
      
      // Filter for matches against Elche
      const elcheMatches = response.data.response.filter(match => 
        match.teams.home.id === ELCHE_ID || match.teams.away.id === ELCHE_ID
      );
      
      if (elcheMatches.length > 0) {
        console.log('🎉 FOUND Elche vs Real Madrid match!');
        elcheMatches.forEach((match, index) => {
          console.log(`\nMatch ${index + 1}:`);
          console.log(`   ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`   League: ${match.league.name}`);
          console.log(`   Date: ${new Date(match.fixture.date).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
          console.log(`   Venue: ${match.fixture.venue?.name || 'Unknown'}`);
          console.log(`   Match ID: ${match.fixture.id}`);
          console.log(`   Status: ${match.fixture.status.long}`);
        });
        
        return elcheMatches;
      } else {
        console.log('ℹ️ No Elche vs Real Madrid matches found for tomorrow.');
        console.log('Available matches:');
        response.data.response.forEach((match, index) => {
          console.log(`   ${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name} (${match.league.name})`);
        });
      }
    } else {
      console.log('ℹ️ No matches found for Real Madrid tomorrow.');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    return [];
  }
}

async function searchTeams() {
  console.log('🔍 Searching for team information...');
  
  try {
    // Search for Elche team with different approaches
    console.log('1. Searching for "Elche" in Spain...');
    const response1 = await axios.get(`${API_URL}/teams`, {
      params: {
        search: 'Elche',
        country: 'Spain'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    console.log('Teams found for "Elche" in Spain:');
    if (response1.data.response && response1.data.response.length > 0) {
      response1.data.response.forEach(team => {
        console.log(`   ${team.team.name} (ID: ${team.team.id}, Country: ${team.team.country})`);
      });
    } else {
      console.log('   No teams found');
    }

    // Search for all Spanish teams to see what's available
    console.log('\n2. Searching for all Spanish teams...');
    const response2 = await axios.get(`${API_URL}/teams`, {
      params: {
        country: 'Spain',
        league: '140' // La Liga ID
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    console.log('Spanish teams in La Liga:');
    if (response2.data.response && response2.data.response.length > 0) {
      response2.data.response.slice(0, 10).forEach(team => {
        console.log(`   ${team.team.name} (ID: ${team.team.id})`);
      });
      if (response2.data.response.length > 10) {
        console.log(`   ...and ${response2.data.response.length - 10} more teams`);
      }
    } else {
      console.log('   No Spanish teams found');
    }

  } catch (error) {
    console.error('Error searching teams:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function searchHeadToHead() {
  console.log('🥊 Searching for head-to-head matches between Elche and Real Madrid...');
  
  try {
    const response = await axios.get(`${API_URL}/fixtures/headtohead`, {
      params: {
        h2h: `${REAL_MADRID_ID}-${ELCHE_ID}`,
        season: VALID_SEASON,
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
    
    console.log('Head-to-head matches found:');
    if (response.data.response && response.data.response.length > 0) {
      response.data.response.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(`   ${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}`);
        console.log(`   Date: ${new Date(match.fixture.date).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);
        console.log(`   League: ${match.league.name}`);
        console.log(`   Status: ${match.fixture.status.long}`);
      });
    } else {
      console.log('No head-to-head matches found');
    }
  } catch (error) {
    console.error('Error searching head-to-head:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing Elche vs Real Madrid match creation capability');
  console.log(`API Key: ${API_KEY ? 'Present' : 'Missing'}`);
  
  // First search for teams to confirm Elche ID
  await searchTeams();
  
  // Search for head-to-head matches
  await searchHeadToHead();
  
  // Then search for the specific match
  const matches = await findElcheVsRealMadridMatch();
  
  if (matches.length > 0) {
    console.log('\n✅ SUCCESS: Elche vs Real Madrid match found and can be created!');
    console.log('The system is ready to create events for this match.');
  } else {
    console.log('\n❌ No Elche vs Real Madrid match found for tomorrow.');
    console.log('Possible reasons:');
    console.log('   - The match may not be scheduled for tomorrow');
    console.log('   - The teams may be playing in different competitions');
    console.log('   - API data may not be up to date');
  }
}

// Run the test
main();