// backend/services/apiFootballService.js
// API-Football.com integration service

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

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

// Get Real Madrid team ID (cache this to avoid repeated API calls)
let realMadridTeamId = null;

async function getRealMadridTeamId() {
  if (realMadridTeamId) return realMadridTeamId;

  return withRetry(async () => {
    try {
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

      if (response.data.response && response.data.response.length > 0) {
        // Find the main Real Madrid team (not youth teams)
        const mainTeam = response.data.response.find(team =>
          team.team.name === 'Real Madrid' && team.team.country === 'Spain'
        );
        
        if (mainTeam) {
          realMadridTeamId = mainTeam.team.id;
          console.log(`✅ Real Madrid Team ID: ${realMadridTeamId}`);
          return realMadridTeamId;
        } else {
          console.log('❌ Main Real Madrid team not found in API response');
          return null;
        }
      } else {
        console.log('❌ Real Madrid team not found in API response');
        return null;
      }
    } catch (error) {
      console.error('API-Football error (team search):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
}

// Get upcoming matches for Real Madrid
async function getUpcomingRealMadridMatches() {
  return withRetry(async () => {
    try {
      const teamId = await getRealMadridTeamId();
      if (!teamId) {
        console.log('❌ Could not find Real Madrid team ID');
        return [];
      }

      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          team: teamId,
          next: 10, // Get next 10 matches
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      if (response.data.response && response.data.response.length > 0) {
        return response.data.response;
      } else {
        console.log('ℹ️ No upcoming Real Madrid matches found');
        return [];
      }
    } catch (error) {
      console.error('API-Football error (fixtures):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
}

// Get next Real Madrid match
async function getNextRealMadridMatch() {
  const matches = await getUpcomingRealMadridMatches();
  if (matches.length === 0) {
    return null;
  }
  
  // Return the earliest upcoming match
  return matches[0];
}

// Get match details including score
async function getMatchDetails(matchId) {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          id: matchId,
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      if (response.data.response && response.data.response.length > 0) {
        return response.data.response[0];
      } else {
        console.log(`❌ Match ${matchId} not found`);
        return null;
      }
    } catch (error) {
      console.error('API-Football error (match details):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
}

// Check if match is finished and get final score
async function isMatchFinished(matchId) {
  const matchDetails = await getMatchDetails(matchId);
  
  if (!matchDetails) {
    return {
      finished: false,
      homeScore: null,
      awayScore: null,
      winner: null
    };
  }

  const fixture = matchDetails.fixture;
  const score = matchDetails.score;
  
  return {
    finished: fixture.status.short === 'FT' || fixture.status.short === 'AET' || fixture.status.short === 'PEN',
    homeScore: score.fulltime.home,
    awayScore: score.fulltime.away,
    winner: getMatchWinner(score.fulltime.home, score.fulltime.away)
  };
}

// Determine match winner
function getMatchWinner(homeScore, awayScore) {
  if (homeScore === awayScore) return 'draw';
  if (homeScore > awayScore) return 'home';
  return 'away';
}

// Get opponent team name for Real Madrid match
function getOpponentName(match, realMadridTeamId) {
  const teams = match.teams;
  const opponent = teams.home.id === realMadridTeamId ? teams.away : teams.home;
  return opponent.name || 'Unknown Opponent';
}

// Get league name for match
function getLeagueName(match) {
  return match.league?.name || 'Unknown League';
}

// Get match result
async function getMatchResult(matchId) {
  return withRetry(async () => {
    try {
      const matchDetails = await getMatchDetails(matchId);
      
      if (!matchDetails) {
        return {
          status: 'unknown',
          finished: false,
          homeScore: null,
          awayScore: null,
          winner: null
        };
      }

      const fixture = matchDetails.fixture;
      const score = matchDetails.score;
      
      return {
        status: fixture.status.short,
        finished: fixture.status.short === 'FT' || fixture.status.short === 'AET' || fixture.status.short === 'PEN',
        homeScore: score.fulltime.home,
        awayScore: score.fulltime.away,
        winner: getMatchWinner(score.fulltime.home, score.fulltime.away)
      };
    } catch (error) {
      console.error('API-Football error (getMatchResult):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
}

// Find next upcoming match (generic function for any team)
async function findNextUpcomingMatch() {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          next: 10, // Get next 10 matches
          timezone: 'Europe/Madrid'
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      if (response.data.response && response.data.response.length > 0) {
        const now = new Date();
        const upcomingMatches = response.data.response.filter(match => {
          const matchTime = new Date(match.fixture.date);
          return matchTime > now;
        });

        return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
      } else {
        console.log('ℹ️ No upcoming matches found');
        return null;
      }
    } catch (error) {
      console.error('API-Football error (findNextUpcomingMatch):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
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