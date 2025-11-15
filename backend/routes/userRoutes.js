const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  claimFreePoints,
  getUserProfile,
  getUserHistory,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  getPointsHistory,
  getDebugUsers,
  generateDebugToken
} = require('../controllers/userController');

const router = express.Router();

// Claim free points endpoint
router.post('/claim-free-points', authenticateToken, async (req, res) => {
  try {
    await claimFreePoints(req.db, req, res);
  } catch (error) {
    console.error('❌ Claim free points route error:', error);
    res.status(500).json({ error: 'Server error during claim process' });
  }
});

// GET user profile endpoint
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    await getUserProfile(req.db, req, res);
  } catch (error) {
    console.error('❌ User profile route error:', error);
    res.status(500).json({ error: 'Server error while fetching user profile' });
  }
});

// GET user prediction history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    await getUserHistory(req.db, req, res);
  } catch (error) {
    console.error('❌ User history route error:', error);
    res.status(500).json({ error: 'Server error while fetching user history' });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    await changePassword(req.db, req, res);
  } catch (error) {
    console.error('❌ Change password route error:', error);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

// Email change verification endpoint
router.post('/request-email-change', authenticateToken, async (req, res) => {
  try {
    await requestEmailChange(req.db, req, res);
  } catch (error) {
    console.error('❌ Email change request route error:', error);
    res.status(500).json({ error: 'Failed to process email change request' });
  }
});

// Email verification endpoint
router.post('/verify-email-change', async (req, res) => {
  try {
    await verifyEmailChange(req.db, req, res);
  } catch (error) {
    console.error('❌ Email verification route error:', error);
    res.status(500).json({ error: 'Failed to verify email change' });
  }
});

// GET user points history
router.get('/points-history', authenticateToken, async (req, res) => {
  try {
    await getPointsHistory(req.db, req, res);
  } catch (error) {
    console.error('❌ Points history route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoints for development/testing
router.get('/debug/users', async (req, res) => {
  try {
    await getDebugUsers(req.db, req, res);
  } catch (error) {
    console.error('❌ Debug users route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary debug endpoint to generate a test token
router.get('/debug/token/:userId', async (req, res) => {
  try {
    await generateDebugToken(req.db, req, res);
  } catch (error) {
    console.error('❌ Debug token route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;