// Test script to check real-time match data and attempt event creation
const { getNextRealMadridMatch, findNextUpcomingMatch } = require('./services/apiFootballService');
const { createFootballMatchEvent, createDailySportEvent } = require('./services/eventService');
require('dotenv').config();

async function testRealTimeMatches() {
  console.log('🔍 Checking for REAL-TIME matches...');
  console.log('=====================================');
  
  try {
    // Check current time and date
    const now = new Date();
    console.log(`Current time: ${now.toLocaleString()}`);
    console.log(`UTC time: ${now.toUTCString()}`);
    
    // Test 1: Check Real Madrid matches with detailed debugging
    console.log('\n1. Checking Real Madrid matches with detailed API call...');
    try {
      const axios = require('axios');
      const API_KEY = process.env.API_FOOTBALL_KEY;
      const API_URL = 'https://v3.football.api-sports.io';
      
      // Make direct API call to see raw response
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          team: 541, // Real Madrid ID
          next: 10,
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });
      
      console.log('API Response status:', response.status);
      console.log('Number of matches found:', response.data.response.length);
      
      if (response.data.response.length > 0) {
        response.data.response.forEach((match, index) => {
          console.log(`\nMatch ${index + 1}:`);
          console.log(`  ${match.teams.home.name} vs ${match.teams.away.name}`);
          console.log(`  League: ${match.league.name}`);
          console.log(`  Date: ${new Date(match.fixture.date).toLocaleString()}`);
          console.log(`  Status: ${match.fixture.status.long}`);
          console.log(`  Match ID: ${match.fixture.id}`);
        });
        
        // Try to create event for the first match
        const firstMatch = response.data.response[0];
        console.log(`\nAttempting to create event for: ${firstMatch.teams.home.name} vs ${firstMatch.teams.away.name}`);
        
        // Check if match is in the future
        const matchTime = new Date(firstMatch.fixture.date);
        if (matchTime > now) {
          console.log('✅ Match is in the future - eligible for event creation');
          
          // Try to create the event
          try {
            const event = await createFootballMatchEvent({ 
              db: require('./server').db 
            }, firstMatch);
            
            if (event) {
              console.log('🎉 SUCCESS: Event created!');
              console.log('Event details:', event);
            } else {
              console.log('ℹ️ Event already exists or creation failed');
            }
          } catch (eventError) {
            console.log('Event creation error (might be expected):', eventError.message);
          }
        } else {
          console.log('❌ Match is in the past or ongoing - not eligible for event creation');
        }
      } else {
        console.log('ℹ️ No Real Madrid matches found in the API response');
      }
      
    } catch (apiError) {
      console.log('Detailed API error:', apiError.message);
      if (apiError.response) {
        console.log('API error data:', apiError.response.data);
      }
    }
    
    // Test 2: Check generic matches
    console.log('\n2. Checking generic upcoming matches...');
    const genericMatch = await findNextUpcomingMatch();
    if (genericMatch) {
      console.log('✅ Found generic match:');
      console.log(`   ${genericMatch.teams.home.name} vs ${genericMatch.teams.away.name}`);
      console.log(`   League: ${genericMatch.league.name}`);
      console.log(`   Date: ${new Date(genericMatch.fixture.date).toLocaleString()}`);
      
      // Try to create generic event
      try {
        const result = await createDailySportEvent({ 
          db: require('./server').db 
        });
        if (result) {
          console.log('✅ Generic event creation attempted');
        }
      } catch (error) {
        console.log('Generic event creation error:', error.message);
      }
    } else {
      console.log('ℹ️ No generic matches found');
    }
    
    console.log('\n📊 REAL-TIME ANALYSIS COMPLETE');
    console.log('The system will automatically create events when matches become available.');
    
  } catch (error) {
    console.error('Real-time test failed:', error.message);
  }
}

testRealTimeMatches();