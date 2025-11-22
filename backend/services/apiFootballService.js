// backend/services/apiFootballService.js
// API-Football.com integration service

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// CORRECT SEASON: The 2024-2025 season is '2024' in the API
const CURRENT_SEASON = 2024; 

// HARDCODED ID: Real Madrid is always 541. No need to search.
const REAL_MADRID_ID = 541;

// Helper function for retry logic
const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Simple getter - no API call needed anymore
async function getRealMadridTeamId() {
  return REAL_MADRID_ID;
}

// Get upcoming matches for Real Madrid
async function getUpcomingRealMadridMatches() {
  return withRetry(async () => {
    try {
      console.log(`⚽ Fetching next matches for Team ID ${REAL_MADRID_ID}...`);
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          team: REAL_MADRID_ID,
          season: CURRENT_SEASON, // <--- ADDED MISSING SEASON PARAMETER
          next: 5, // Get next 5 matches to be safe
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
        console.error('❌ API Error:', JSON.stringify(response.data.errors));
        return [];
      }

      const matches = response.data.response;
      if (matches && matches.length > 0) {
        console.log(`✅ Found ${matches.length} upcoming Real Madrid matches`);
        return matches;
      } else {
        console.log('ℹ️ No upcoming Real Madrid matches found (Response array empty)');
        return [];
      }
    } catch (error) {
      console.error('API-Football error (fixtures):', error.message);
      return [];
    }
  });
}

// Get next Real Madrid match
async function getNextRealMadridMatch() {
  const matches = await getUpcomingRealMadridMatches();
  if (matches.length === 0) return null;
  return matches[0];
}

// Get match details including score
async function getMatchDetails(matchId) {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { id: matchId, timezone: 'Europe/Madrid' },
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });
      return response.data.response ? response.data.response[0] : null;
    } catch (error) {
      console.error(`Error fetching match ${matchId}:`, error.message);
      return null;
    }
  });
}

// Check if match is finished
async function isMatchFinished(matchId) {
  const matchDetails = await getMatchDetails(matchId);
  if (!matchDetails) return { finished: false, winner: null };

  const { fixture, score, teams } = matchDetails;
  
  // Determine winner
  let winner = null;
  if (score.fulltime.home > score.fulltime.away) winner = 'home';
  else if (score.fulltime.away > score.fulltime.home) winner = 'away';
  else winner = 'draw';

  return {
    finished: ['FT', 'AET', 'PEN'].includes(fixture.status.short),
    homeScore: score.fulltime.home,
    awayScore: score.fulltime.away,
    winner
  };
}

// Helpers
function getOpponentName(match, myTeamId) {
  const homeId = match.teams.home.id;
  // If Real Madrid (myTeamId) is home, opponent is away.
  return homeId === myTeamId ? match.teams.away.name : match.teams.home.name;
}

function getLeagueName(match) {
  return match.league?.name || 'Unknown League';
}

function getMatchResult(matchId) {
  return isMatchFinished(matchId); // Reuse logic
}

// Optimized: Find next match (General) - Now defaults to Real Madrid to save API calls
async function findNextUpcomingMatch() {
  // For your specific use case, we can just return the Real Madrid match
  // This saves you from searching the entire Premier League
  return getNextRealMadridMatch();
}

module.exports = {
  getNextRealMadridMatch,
  getMatchDetails,
  isMatchFinished,
  getRealMadridTeamId,
  getOpponentName,
  getLeagueName,
  getMatchResult,
  findNextUpcomingMatch
};