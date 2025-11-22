// backend/services/apiFootballService.js
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// --- CRITICAL CONFIGURATION ---
// 1. Use 2024 to match the REAL WORLD calendar (even if your app simulates 2025)
const CURRENT_SEASON = 2024; 
// 2. Hardcode Real Madrid ID (541) to prevent search errors
const REAL_MADRID_ID = 541; 
// ------------------------------

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

async function getRealMadridTeamId() {
  return REAL_MADRID_ID;
}

async function getUpcomingRealMadridMatches() {
  return withRetry(async () => {
    try {
      console.log(`⚽ Fetching matches for Team ${REAL_MADRID_ID}, Season ${CURRENT_SEASON}...`);
      
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          team: REAL_MADRID_ID,
          season: CURRENT_SEASON, // <--- THIS PARAMETER WAS MISSING
          next: 5,                // Get the next 5 scheduled games
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
      }

      const matches = response.data.response;
      if (matches && matches.length > 0) {
        console.log(`✅ Found ${matches.length} upcoming matches.`);
        return matches;
      } else {
        console.log('ℹ️ No matches found (Response was empty).');
        return [];
      }
    } catch (error) {
      console.error('API Error:', error.message);
      return [];
    }
  });
}

// ... Keep the rest of your helper functions (getMatchDetails, isMatchFinished, etc.) ...
// Just ensure they are exported at the bottom:

async function getNextRealMadridMatch() {
  const matches = await getUpcomingRealMadridMatches();
  return matches.length > 0 ? matches[0] : null;
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

async function findNextUpcomingMatch() {
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
