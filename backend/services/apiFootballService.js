// backend/services/apiFootballService.js
// API-Football.com integration service

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = 'https://v3.football.api-sports.io';

// Current season for API calls (November 2025)
const CURRENT_SEASON = 2025; // Active season for most leagues (EPL, La Liga) is 2025

// Major league IDs for reliable API calls on free tier
const MAJOR_LEAGUES = [
  39,  // Premier League
  140, // La Liga
  78,  // Bundesliga
  135, // Serie A
  61   // Ligue 1
];

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
          'x-apisports-key': API_KEY,
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
          'x-apisports-key': API_KEY,
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
          'x-apisports-key': API_KEY,
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

// Find next upcoming match with improved reliability for free tier
async function findNextUpcomingMatch() {
  return withRetry(async () => {
    try {
      // 1. Try specific major leagues first (More reliable on Free plans)
      // League 39 = Premier League, 140 = La Liga
      // SEASON: Must be 2025 for Nov 2025!
      const url = `${API_URL}/fixtures?league=39&season=${CURRENT_SEASON}&next=5&timezone=Europe/Madrid`;
      
      console.log(`🔍 Debug: Fetching from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'x-apisports-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 10000
      });

      // 2. LOG THE FULL ERROR/RESPONSE
      // Often the API returns 200 OK but with an internal "errors" object
      if (response.data.errors && Object.keys(response.data.errors).length > 0) {
        console.error('❌ API-Football Error:', JSON.stringify(response.data.errors, null, 2));
        return null;
      }

      const matches = response.data.response;
      
      if (!matches || matches.length === 0) {
        console.warn('⚠️ API returned 0 matches. Raw Response:', JSON.stringify(response.data, null, 2));
        
        // 3. Fallback: Try other major leagues if Premier League fails
        for (const leagueId of MAJOR_LEAGUES.slice(1)) { // Skip first (already tried)
          try {
            console.log(`🔄 Trying fallback league ${leagueId}...`);
            const fallbackUrl = `${API_URL}/fixtures?league=${leagueId}&season=${CURRENT_SEASON}&next=5&timezone=Europe/Madrid`;
            console.log(`🔍 Debug: Fallback to ${fallbackUrl}`);
            
            const fallbackResponse = await axios.get(fallbackUrl, {
              headers: {
                'x-apisports-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
              },
              timeout: 5000
            });

            if (fallbackResponse.data.response && fallbackResponse.data.response.length > 0) {
              console.log(`✅ Found ${fallbackResponse.data.response.length} matches in league ${leagueId}`);
              return fallbackResponse.data.response[0];
            }
          } catch (fallbackError) {
            console.warn(`⚠️ Fallback league ${leagueId} failed:`, fallbackError.message);
            continue;
          }
        }
        
        return null;
      }

      return matches[0];

    } catch (error) {
      console.error('💥 Network Error:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      return null;
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