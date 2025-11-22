const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// CORRECT CONFIGURATION FOR NOV 2025
const CURRENT_SEASON = 2025; 
const REAL_MADRID_ID = 541; 

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
      
      // 1. Fetch ALL matches for the 2025 season
      // We do NOT use 'next: 10' because if the API server is in 2024, it will return wrong games.
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          team: REAL_MADRID_ID,
          season: CURRENT_SEASON,
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      if (!response.data.response || response.data.response.length === 0) {
        console.log('ℹ️ API returned no matches for Season 2025.');
        return [];
      }

      const allMatches = response.data.response;
      
      // 2. Filter LOCALLY using YOUR system time (Nov 2025)
      const now = new Date();
      console.log(`📅 Filtering matches after: ${now.toISOString()}`);

      // 2. Filter for FUTURE matches only
      const futureMatches = allMatches
        .filter(match => new Date(match.fixture.date) > now)
        .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

      if (futureMatches.length > 0) {
        const nextMatch = futureMatches[0];
        console.log(`✅ Found next match: ${nextMatch.teams.home.name} vs ${nextMatch.teams.away.name} (${nextMatch.fixture.date})`);
        return futureMatches.slice(0, 5); // Return next 5
      } else {
        console.log('ℹ️ Season 2025 data found, but no future matches remaining.');
        return [];
      }

    } catch (error) {
      console.error('API Error:', error.message);
      return [];
    }
  });
}

// --- Helper Functions (Unchanged) ---

async function getNextRealMadridMatch() {
  const matches = await getUpcomingRealMadridMatches();
  return matches.length > 0 ? matches[0] : null;
}

async function getMatchDetails(matchId) {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: { id: matchId, timezone: 'Europe/Madrid' },
        headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
      });
      return response.data.response ? response.data.response[0] : null;
    } catch (error) { return null; }
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
