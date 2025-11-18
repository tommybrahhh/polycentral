// Debug script for API-Football connection
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

async function debugAPICall() {
  console.log('🔍 Debugging API-Football connection...');
  console.log(`API Key present: ${!!API_KEY}`);
  console.log(`API Key length: ${API_KEY ? API_KEY.length : 0}`);
  
  try {
    // Test a simple teams call without specific parameters first
    console.log('Testing basic teams API call...');
    const response = await axios.get(`${API_URL}/teams`, {
      params: {
        search: 'Real Madrid'
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      timeout: 10000
    });

    console.log('✅ API Response received!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.response && response.data.response.length > 0) {
      console.log('Teams found:', response.data.response.map(team => ({
        id: team.team.id,
        name: team.team.name,
        country: team.team.country
      })));
    } else {
      console.log('No teams found in response');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
  }
}

debugAPICall();