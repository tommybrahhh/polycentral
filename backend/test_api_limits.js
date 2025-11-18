// Test script to understand API-Football scheduling limits and advance notice
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

async function testAPILimits() {
  console.log('🔍 Testing API-Football Scheduling Limits');
  console.log('==========================================');
  
  try {
    // Test 1: Check different time ranges for Real Madrid
    console.log('\n1. Testing different time ranges for Real Madrid (ID: 541)');
    
    const timeRanges = [
      { days: 1, label: 'Next 24 hours' },
      { days: 7, label: 'Next 7 days' },
      { days: 30, label: 'Next 30 days' },
      { days: 90, label: 'Next 90 days' }
    ];
    
    for (const range of timeRanges) {
      console.log(`\n   Testing: ${range.label}`);
      try {
        const response = await axios.get(`${API_URL}/fixtures`, {
          params: {
            team: 541, // Real Madrid
            next: Math.ceil(range.days / 2), // Approximate number of matches
            timezone: 'Europe/Madrid'
          },
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          },
          timeout: 10000
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Matches found: ${response.data.response.length}`);
        
        if (response.data.response.length > 0) {
          response.data.response.forEach((match, index) => {
            const matchDate = new Date(match.fixture.date);
            const daysUntil = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 24));
            console.log(`     ${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
            console.log(`        Date: ${matchDate.toLocaleDateString()}`);
            console.log(`        Days until: ${daysUntil}`);
            console.log(`        League: ${match.league.name}`);
          });
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Test 2: Check current season and league status
    console.log('\n2. Checking league and season status');
    try {
      const leaguesResponse = await axios.get(`${API_URL}/leagues`, {
        params: {
          team: 541, // Leagues for Real Madrid
          current: true // Current season
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });
      
      console.log('   Current leagues for Real Madrid:');
      if (leaguesResponse.data.response.length > 0) {
        leaguesResponse.data.response.forEach(league => {
          console.log(`   - ${league.league.name} (${league.country.name})`);
          console.log(`     Season: ${league.season}`);
          console.log(`     Current: ${league.seasons?.[0]?.current || 'Unknown'}`);
        });
      } else {
        console.log('   No current leagues found');
      }
    } catch (error) {
      console.log(`   League check error: ${error.message}`);
    }
    
    // Test 3: Check API rate limits and constraints
    console.log('\n3. Checking API documentation patterns');
    console.log('   Based on typical football API behavior:');
    console.log('   - Leagues usually schedule matches 2-6 weeks in advance');
    console.log('   - Major tournaments schedule 3-6 months in advance');
    console.log('   - Off-season periods may have no scheduled matches');
    console.log('   - API updates depend on league administration schedules');
    
    console.log('\n📋 TYPICAL FOOTBALL SCHEDULING:');
    console.log('================================');
    console.log('• League matches: 2-4 weeks advance notice');
    console.log('• Cup matches: 1-2 months advance notice');
    console.log('• International matches: 2-3 months advance notice');
    console.log('• Tournament group stages: 3-6 months advance notice');
    console.log('• Off-season: No matches scheduled (June-August, December-January)');
    
  } catch (error) {
    console.error('API limits test failed:', error.message);
  }
}

testAPILimits();