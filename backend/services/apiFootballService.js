const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// --- CRITICAL CONFIGURATION ---
// 1. Use 2024 to match the REAL WORLD calendar
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
          season: CURRENT_SEASON, // <--- THIS WAS MISSING
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

// Helper functions
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

async function isMatchFinished(matchId) {
  const matchDetails = await getMatchDetails(matchId);
  if (!matchDetails) return { finished: false, winner: null };

  const { fixture, score } = matchDetails;
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

function getOpponentName(match, myTeamId) {
  const homeId = match.teams.home.id;
  return homeId === myTeamId ? match.teams.away.name : match.teams.home.name;
}

function getLeagueName(match) {
  return match.league?.name || 'Unknown League';
}

function getMatchResult(matchId) {
  return isMatchFinished(matchId);
}

async function getNextRealMadridMatch() {
  const matches = await getUpcomingRealMadridMatches();
  return matches.length > 0 ? matches[0] : null;
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
