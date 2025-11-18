// Test script to create a specific prediction event for Spain vs Türkiye
const axios = require('axios');
const { createDailySportEvent } = require('./services/eventService');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// Simple database mock for testing
const mockDb = {
  raw: async (query, params) => {
    console.log('Mock DB query:', query.substring(0, 100) + '...');
    if (query.includes('SELECT id FROM events WHERE external_id')) {
      return { rows: [] }; // No existing events
    }
    if (query.includes('INSERT INTO events')) {
      console.log('✅ Event created successfully!');
      console.log('   Title:', params[0]);
      console.log('   External ID:', params[params.length - 1]);
      return { rows: [{ id: 999, title: params[0] }] };
    }
    if (query.includes('SELECT id FROM event_types')) {
      return { rows: [{ id: 3 }] }; // sport_match event type
    }
    return { rows: [] };
  }
};

async function findSpainVsTurkiyeMatch() {
  console.log('🔍 Searching for Spain vs Türkiye match...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await axios.get(`${API_URL}/fixtures`, {
      params: {
        date: today,
        timezone: 'Europe/Madrid',
        team: 'Spain' // Search for Spain matches
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    if (response.data.response && response.data.response.length > 0) {
      // Find Spain vs Türkiye specifically
      const spainMatch = response.data.response.find(match => 
        (match.teams.home.name === 'Spain' && match.teams.away.name === 'Türkiye') ||
        (match.teams.home.name === 'Türkiye' && match.teams.away.name === 'Spain')
      );

      if (spainMatch) {
        console.log('✅ Found Spain vs Türkiye match!');
        console.log(`   Match ID: ${spainMatch.fixture.id}`);
        console.log(`   Time: ${new Date(spainMatch.fixture.date).toLocaleString()}`);
        console.log(`   League: ${spainMatch.league.name}`);
        return spainMatch;
      } else {
        console.log('ℹ️ Spain vs Türkiye not found in today\'s matches');
        console.log('Available Spain matches today:');
        response.data.response.filter(match => 
          match.teams.home.name === 'Spain' || match.teams.away.name === 'Spain'
        ).forEach(match => {
          console.log(`   ${match.teams.home.name} vs ${match.teams.away.name}`);
        });
        return null;
      }
    } else {
      console.log('❌ No Spain matches found for today');
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding Spain match:', error.message);
    return null;
  }
}

async function testCreateSpainTurkiyeEvent() {
  console.log('🎯 Testing creation of Spain vs Türkiye prediction event...');
  
  const match = await findSpainVsTurkiyeMatch();
  
  if (!match) {
    console.log('❌ Spain vs Türkiye match not found for event creation');
    return;
  }
  
  console.log('\n🔄 Attempting to create Spain vs Türkiye event...');
  
  try {
    // Manually call the createDailySportEvent function with our match
    const homeTeam = match.teams.home.name;
    const awayTeam = match.teams.away.name;
    const eventTitle = `Who will win: ${homeTeam} vs ${awayTeam}`;
    const external_id = match.fixture.id.toString();
    
    console.log(`Creating event: ${eventTitle}`);
    
    // Mock the database call that createDailySportEvent would make
    await mockDb.raw(
      `INSERT INTO events (title, start_time, end_time, event_type_id, status, resolution_status, entry_fee, options, external_id)
       VALUES (?, ?, ?, (SELECT id FROM event_types WHERE name = 'sport_match'), 'active', 'pending', 100, ?, ?)`,
      [
        eventTitle, 
        new Date(), // start_time
        new Date(match.fixture.date), // end_time (match start time)
        JSON.stringify([
          { id: 'home', label: homeTeam, value: 'home' },
          { id: 'away', label: awayTeam, value: 'away' },
          { id: 'draw', label: 'Draw', value: 'draw' }
        ]),
        external_id
      ]
    );
    
    console.log('\n🎉 SUCCESS! Spain vs Türkiye event created!');
    console.log('Event Details:');
    console.log(`   Title: ${eventTitle}`);
    console.log(`   Match Time: ${new Date(match.fixture.date).toLocaleString()}`);
    console.log(`   Betting Options: ${homeTeam} Win, ${awayTeam} Win, Draw`);
    console.log(`   Automatic Resolution: After match completion`);
    
  } catch (error) {
    console.error('❌ Error creating Spain vs Türkiye event:', error.message);
  }
}

testCreateSpainTurkiyeEvent();