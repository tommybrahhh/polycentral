// backend/controllers/leaderboardController.js
// Leaderboard controller functions

const { getLeaderboard } = require('../services/leaderboardService');

// Get leaderboard data
async function getLeaderboardController(db, req, res) {
    try {
        console.log('Leaderboard endpoint called with query:', req.query);
        
        const { page = 1, limit = 20 } = req.query;
        const response = await getLeaderboard(db, page, limit);

        console.log('Sending leaderboard response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getLeaderboard: getLeaderboardController
};

