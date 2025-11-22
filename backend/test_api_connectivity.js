// Test script to check API-Football connectivity and available data
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY || 'f4bd10a216c6c769c3f49cfa0182cc44';
const API_URL = 'https://v3.football.api-sports.io';

async function testAPIConnectivity() {
  console.log('🔌 Testing API-Football connectivity...');
  console.log(`API Key: ${API_KEY ? 'Present' : 'Missing'}`);
  
  try {
    // Test basic leagues endpoint
    console.log('\n1. Testing leagues endpoint...');
    const leaguesResponse = await axios.get(`${API_URL}/leagues`, {
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    console.log('Leagues response status:', leaguesResponse.status);
    if (leaguesResponse.data.response && leaguesResponse.data.response.length > 0) {
      console.log('Available leagues:');
      leaguesResponse.data.response.slice(0, 5).forEach(league => {
        console.log(`   ${league.league.name} (ID: ${league.league.id}, Country: ${league.country.name})`);
      });
      if (leaguesResponse.data.response.length > 5) {
        console.log(`   ...and ${leaguesResponse.data.response.length - 5} more leagues`);
      }
    } else {
      console.log('No leagues found in response');
      console.log('Response data:', JSON.stringify(leaguesResponse.data, null, 2));
    }

    // Test teams endpoint with a known league
    console.log('\n2. Testing teams endpoint for Premier League...');
    const teamsResponse = await axios.get(`${API_URL}/teams`, {
      params: {
        league: '39', // Premier League ID
        season: '2023'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    console.log('Teams response status:', teamsResponse.status);
    if (teamsResponse.data.response && teamsResponse.data.response.length > 0) {
      console.log('Premier League teams:');
      teamsResponse.data.response.slice(0, 5).forEach(team => {
        console.log(`   ${team.team.name} (ID: ${team.team.id})`);
      });
      if (teamsResponse.data.response.length > 5) {
        console.log(`   ...and ${teamsResponse.data.response.length - 5} more teams`);
      }
    } else {
      console.log('No teams found for Premier League');
      console.log('Response data:', JSON.stringify(teamsResponse.data, null, 2));
    }

    // Test La Liga teams specifically - try 2025 season
    console.log('\n2a. Testing La Liga teams for 2025 season...');
    const laLigaResponse = await axios.get(`${API_URL}/teams`, {
      params: {
        league: '140', // La Liga ID
        season: '2025'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    console.log('La Liga teams response status:', laLigaResponse.status);
    if (laLigaResponse.data.response && laLigaResponse.data.response.length > 0) {
      console.log('La Liga teams:');
      laLigaResponse.data.response.forEach(team => {
        console.log(`   ${team.team.name} (ID: ${team.team.id})`);
      });
      
      // Search for Elche specifically in the response
      const elcheTeam = laLigaResponse.data.response.find(team =>
        team.team.name.toLowerCase().includes('elche')
      );
      if (elcheTeam) {
        console.log(`\n✅ Found Elche: ${elcheTeam.team.name} (ID: ${elcheTeam.team.id})`);
      } else {
        console.log('\n❌ Elche not found in La Liga teams');
        
        // Search for Elche in all Spanish teams with 2025 season
        console.log('\n2b. Searching for Elche in all Spanish teams for 2025...');
        const spanishTeamsResponse = await axios.get(`${API_URL}/teams`, {
          params: {
            country: 'Spain',
            search: 'Elche',
            season: '2025'
          },
          headers: {
            'x-apisports-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        });
        
        if (spanishTeamsResponse.data.response && spanishTeamsResponse.data.response.length > 0) {
          console.log('Spanish teams with "Elche" in 2025:');
          spanishTeamsResponse.data.response.forEach(team => {
            console.log(`   ${team.team.name} (ID: ${team.team.id}, League: ${team.league?.name || 'Unknown'})`);
          });
        } else {
          console.log('No Elche teams found in Spain for 2025 season');
          console.log('Response data:', JSON.stringify(spanishTeamsResponse.data, null, 2));
        }
      }
    } else {
      console.log('No teams found for La Liga');
      console.log('Response data:', JSON.stringify(laLigaResponse.data, null, 2));
    }

    // Test current season fixtures
    console.log('\n3. Testing current fixtures...');
    const today = new Date().toISOString().split('T')[0];
    const fixturesResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        date: today,
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    console.log('Fixtures response status:', fixturesResponse.status);
    if (fixturesResponse.data.response && fixturesResponse.data.response.length > 0) {
      console.log(`Today's fixtures (${today}):`);
      fixturesResponse.data.response.slice(0, 3).forEach(fixture => {
        console.log(`   ${fixture.teams.home.name} vs ${fixture.teams.away.name} (${fixture.league.name})`);
      });
      if (fixturesResponse.data.response.length > 3) {
        console.log(`   ...and ${fixturesResponse.data.response.length - 3} more fixtures`);
      }
    } else {
      console.log('No fixtures found for today');
      console.log('Response data:', JSON.stringify(fixturesResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
  }
}

// Run the test
testAPIConnectivity();