// backend/debug_sportmonks_api.js
// Debug script to analyze Sportmonks API response

require('dotenv').config({ path: './.env' });
const axios = require('axios');

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
const API_URL = 'https://api.sportmonks.com/v3/football';

async function debugSportmonksAPI() {
  console.log('🔍 Debugging Sportmonks API...');
  console.log(`API Token: ${API_TOKEN ? 'Set' : 'Not set'}`);
  console.log(`Team ID: 3468 (Real Madrid)`);
  
  try {
    // Test 1: Check fixtures endpoint without filters
    console.log('\n1. Testing /fixtures endpoint (no filters)...');
    const fixturesResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        api_token: API_TOKEN,
        include: 'participants;league',
        per_page: 10,
        sort: 'starting_at'
      },
      timeout: 10000
    });
    
    console.log(`✅ Got ${fixturesResponse.data.data.length} fixtures total`);
    console.log('All fixtures:');
    fixturesResponse.data.data.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.name} - ${new Date(match.starting_at).toLocaleString()} - Status: ${match.status}`);
    });
    
    // Test 2: Check with Real Madrid team filter
    console.log('\n2. Testing /fixtures with Real Madrid filter...');
    const realMadridResponse = await axios.get(`${API_URL}/fixtures`, {
      params: {
        api_token: API_TOKEN,
        filters: 'teamIds:3468',
        include: 'participants;league;season',
        sort: 'starting_at',
        per_page: 20
      },
      timeout: 10000
    });
    
    console.log(`✅ Got ${realMadridResponse.data.data.length} Real Madrid fixtures`);
    if (realMadridResponse.data.data.length > 0) {
      console.log('Real Madrid fixtures:');
      realMadridResponse.data.data.forEach((match, index) => {
        const participants = match.participants?.map(p => p.name).join(' vs ') || 'Unknown teams';
        console.log(`  ${index + 1}. ${participants} - ${new Date(match.starting_at).toLocaleString()} - ${match.league?.name || 'No league'} - Status: ${match.status}`);
      });
    } else {
      console.log('❌ No Real Madrid fixtures found with team filter');
    }
    
    // Test 3: Check upcoming matches endpoint
    console.log('\n3. Testing /fixtures/upcoming endpoint...');
    try {
      const upcomingResponse = await axios.get(`${API_URL}/fixtures/upcoming`, {
        params: {
          api_token: API_TOKEN,
          include: 'participants;league',
          per_page: 10,
          sort: 'starting_at'
        },
        timeout: 10000
      });
      
      console.log(`✅ Got ${upcomingResponse.data.data.length} upcoming fixtures`);
      upcomingResponse.data.data.forEach((match, index) => {
        const participants = match.participants?.map(p => p.name).join(' vs ') || 'Unknown teams';
        console.log(`  ${index + 1}. ${participants} - ${new Date(match.starting_at).toLocaleString()} - ${match.league?.name || 'No league'}`);
      });
    } catch (upcomingError) {
      console.log('❌ /fixtures/upcoming endpoint not available or failed:', upcomingError.message);
    }
    
    // Test 4: Check if team ID 3468 exists
    console.log('\n4. Verifying team ID 3468...');
    try {
      const teamResponse = await axios.get(`${API_URL}/teams/3468`, {
        params: {
          api_token: API_TOKEN
        },
        timeout: 10000
      });
      
      console.log(`✅ Team 3468 found: ${teamResponse.data.data.name} (${teamResponse.data.data.short_code})`);
    } catch (teamError) {
      console.log('❌ Team ID 3468 not found or access denied:', teamError.message);
    }
    
    // Test 5: Check what leagues/seasons are available
    console.log('\n5. Checking available leagues...');
    try {
      const leaguesResponse = await axios.get(`${API_URL}/leagues`, {
        params: {
          api_token: API_TOKEN,
          per_page: 10
        },
        timeout: 10000
      });
      
      console.log(`✅ Got ${leaguesResponse.data.data.length} leagues:`);
      leaguesResponse.data.data.forEach((league, index) => {
        console.log(`  ${index + 1}. ${league.name} (ID: ${league.id}) - ${league.type}`);
      });
    } catch (leaguesError) {
      console.log('❌ Could not fetch leagues:', leaguesError.message);
    }
    
  } catch (error) {
    console.error('❌ API Debug failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugSportmonksAPI().catch(console.error);