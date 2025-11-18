// Debug script to understand why Spain vs Türkiye isn't being found
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

async function debugSpainSearch() {
  console.log('🔍 Debugging Spain match search...');
  
  try {
    // First, let's search for Spain team ID
    console.log('\n1. Searching for Spain team...');
    const teamResponse = await axios.get(`${API_URL}/teams`, {
      params: {
        search: 'Spain',
        country: 'Spain'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    console.log('Spain team search results:', JSON.stringify(teamResponse.data, null, 2));

    // Now let's search for all matches today without team filter
    console.log('\n2. Searching all matches for today...');
    const today = new Date().toISOString().split('T')[0];
    const matchesResponse = await axios.get(`${API_URL}/fixtures`, {
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

    if (matchesResponse.data.response && matchesResponse.data.response.length > 0) {
      console.log(`Found ${matchesResponse.data.response.length} matches today`);
      
      // Look for Spain or Türkiye in any match
      const relevantMatches = matchesResponse.data.response.filter(match => {
        const home = match.teams.home.name.toLowerCase();
        const away = match.teams.away.name.toLowerCase();
        return home.includes('spain') || away.includes('spain') || 
               home.includes('türkiye') || away.includes('türkiye') ||
               home.includes('turkey') || away.includes('turkey');
      });

      console.log('\nRelevant matches found:');
      relevantMatches.forEach(match => {
        console.log(`   ${match.teams.home.name} vs ${match.teams.away.name}`);
        console.log(`   League: ${match.league.name}`);
        console.log(`   Time: ${new Date(match.fixture.date).toLocaleString()}`);
        console.log(`   Status: ${match.fixture.status.long}`);
        console.log('   ---');
      });

      if (relevantMatches.length === 0) {
        console.log('No Spain or Türkiye matches found in today\'s fixtures');
        console.log('First few matches today:');
        matchesResponse.data.response.slice(0, 5).forEach(match => {
          console.log(`   ${match.teams.home.name} vs ${match.teams.away.name}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugSpainSearch();