// backend/services/sportmonksService.js
// Sportmonks Football API integration service

const axios = require('axios');
require('dotenv').config();

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
const API_URL = 'https://api.sportmonks.com/v3/football';

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

  // Use hardcoded Real Madrid ID (3468 is the correct ID according to Sportmonks documentation)
  // The free plan doesn't include team search functionality
  const hardcodedTeamId = 3468;
  
  // For free plan, we'll use the hardcoded ID without verification
  console.log(`⚽ Using hardcoded Real Madrid ID: ${hardcodedTeamId} (Free plan limitations)`);
  realMadridTeamId = hardcodedTeamId;
  return realMadridTeamId;
}

// Get upcoming matches for Real Madrid
async function getUpcomingRealMadridMatches() {
  return withRetry(async () => {
    try {
      const teamId = await getRealMadridTeamId();
      
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          api_token: API_TOKEN,
          filters: `teamIds:${teamId}`,
          include: 'participants;league;season',
          sort: 'starting_at'
        },
        timeout: 10000
      });
      
      const now = new Date();
      const upcomingMatches = response.data.data.filter(match => {
        const matchTime = new Date(match.starting_at);
        return matchTime > now && matchTime < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
      });
      
      return upcomingMatches;
    } catch (error) {
      console.error('Sportmonks API error (fixtures):', {
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
      const response = await axios.get(`${API_URL}/fixtures/${matchId}`, {
        params: {
          api_token: API_TOKEN,
          include: 'participants;league;season;scores'
        },
        timeout: 10000
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Sportmonks API error (match details):', {
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
  
  return {
    finished: matchDetails.status === 'FT' || matchDetails.status === 'AET' || matchDetails.status === 'PEN',
    homeScore: matchDetails.scores?.find(score => score.description === 'CURRENT')?.score?.home,
    awayScore: matchDetails.scores?.find(score => score.description === 'CURRENT')?.score?.away,
    winner: getMatchWinner(matchDetails)
  };
}

// Determine match winner
function getMatchWinner(matchDetails) {
  if (!matchDetails.scores) return null;
  
  const currentScore = matchDetails.scores.find(score => score.description === 'CURRENT');
  if (!currentScore) return null;
  
  const homeScore = currentScore.score?.home;
  const awayScore = currentScore.score?.away;
  
  if (homeScore === awayScore) return 'draw';
  if (homeScore > awayScore) return 'home';
  return 'away';
}

// Get opponent team name for Real Madrid match
function getOpponentName(match, realMadridTeamId) {
  const participants = match.participants || [];
  const opponent = participants.find(participant => participant.id !== realMadridTeamId);
  return opponent ? opponent.name : 'Unknown Opponent';
}

// Get league name for match
function getLeagueName(match) {
  return match.league?.name || 'Unknown League';
}

// Find next upcoming match (generic function)
async function findNextUpcomingMatch() {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures`, {
        params: {
          api_token: API_TOKEN,
          include: 'participants;league',
          sort: 'starting_at',
          per_page: 10
        },
        timeout: 10000
      });
      
      const now = new Date();
      const upcomingMatches = response.data.data.filter(match => {
        const matchTime = new Date(match.starting_at);
        return matchTime > now;
      });
      
      return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
    } catch (error) {
      console.error('Sportmonks API error (findNextUpcomingMatch):', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });
}

// Get match result
async function getMatchResult(matchId) {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${API_URL}/fixtures/${matchId}`, {
        params: {
          api_token: API_TOKEN,
          include: 'scores;participants'
        },
        timeout: 10000
      });
      
      const match = response.data.data;
      const currentScore = match.scores?.find(score => score.description === 'CURRENT');
      
      return {
        status: match.status,
        finished: match.status === 'FT' || match.status === 'AET' || match.status === 'PEN',
        homeScore: currentScore?.score?.home,
        awayScore: currentScore?.score?.away,
        winner: getMatchWinner(match)
      };
    } catch (error) {
      console.error('Sportmonks API error (getMatchResult):', {
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