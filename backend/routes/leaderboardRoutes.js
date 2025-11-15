const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

// GET leaderboard data
router.get('/', async (req, res) => {
  try {
    await getLeaderboard(req.db, req, res);
  } catch (error) {
    console.error('❌ Leaderboard route error:', error);
    res.status(500).json({ error: 'Server error while fetching leaderboard' });
  }
});

module.exports = router;