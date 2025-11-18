// Test script to check Spain National Team (ID 9) matches
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

async function testSpainNationalTeam() {
  console.log('🇪🇸 Testing Spain National Team (ID 9) Matches');
  console.log('==============================================');
  
  try {
    // Test Spain National Team matches
    console.log('\n1. Checking Spain National Team fixtures...');
    
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: {
        team: 9, // Spain National Team ID
        next: 10, // Next 10 matches
        timezone: 'Europe/Madrid'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });
    
    console.log('API Status:', response.status);
    console.log('Matches found:', response.data.response.length);
    
    if (response.data.response.length > 0) {
      console.log('\n📅 Upcoming Spain National Team Matches:');
      response.data.response.forEach((match, index) => {
        const matchDate = new Date(match.fixture.date);
        const daysUntil = Math.ceil((matchDate - new Date()) / (1000 * 60 * 60 * 24));
        console.log(`\n${index + 1}. ${match.teams.home.name} vs ${match.teams.away.name}`);
        console.log(`   Date: ${matchDate.toLocaleString()}`);
        console.log(`   Days until: ${daysUntil} days`);
        console.log(`   Competition: ${match.league.name}`);
        console.log(`   Match ID: ${match.fixture.id}`);
        console.log(`   Venue: ${match.venue?.name || 'Unknown'}, ${match.venue?.city || 'Unknown'}`);
      });
      
      // Test event creation capability
      console.log('\n2. Testing Event Creation Capability...');
      const firstMatch = response.data.response[0];
      const matchTime = new Date(firstMatch.fixture.date);
      
      if (matchTime > new Date()) {
        console.log('✅ Match is in the future - eligible for event creation');
        
        // Simulate event creation
        const eventTitle = `${firstMatch.teams.home.name} vs ${firstMatch.teams.away.name} - ${firstMatch.league.name}`;
        console.log(`   Event Title: ${eventTitle}`);
        
        const options = [
          { id: 'home', label: firstMatch.teams.home.name, value: 'home' },
          { id: 'away', label: firstMatch.teams.away.name, value: 'away' },
          { id: 'draw', label: 'Draw', value: 'draw' }
        ];
        
        console.log(`   Betting Options: ${options.map(opt => opt.label).join(', ')}`);
        console.log(`   Event End Time: ${matchTime.toLocaleString()}`);
        console.log(`   External ID: ${firstMatch.fixture.id}`);
        console.log('✅ Event creation capability: CONFIRMED');
      } else {
        console.log('❌ Match is in the past - not eligible for event creation');
      }
    } else {
      console.log('ℹ️ No upcoming matches found for Spain National Team');
      
      // Check if team exists and get details
      console.log('\n2. Checking Spain National Team details...');
      const teamResponse = await axios.get(`${API_URL}/teams`, {
        params: {
          id: 9
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });
      
      if (teamResponse.data.response.length > 0) {
        const team = teamResponse.data.response[0];
        console.log('✅ Spain National Team found:');
        console.log(`   Name: ${team.team.name}`);
        console.log(`   Country: ${team.team.country}`);
        console.log(`   Founded: ${team.team.founded}`);
        console.log(`   Logo: ${team.team.logo}`);
      } else {
        console.log('❌ Spain National Team not found with ID 9');
      }
    }
    
  } catch (error) {
    console.error('❌ Spain National Team test failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

testSpainNationalTeam();