const express = require('express');
const jwt = require('jsonwebtoken');
const { registerUser, loginUser, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
    await registerUser(req.db, req, res);
  } catch (error) {
    console.error('❌ Registration route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    await loginUser(req.db, req, res);
  } catch (error) {
    console.error('❌ Login route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Password reset request endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    await forgotPassword(req.db, req, res);
  } catch (error) {
    console.error('Forgot password route error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Password reset confirmation endpoint
router.post('/reset-password', async (req, res) => {
  try {
    await resetPassword(req.db, req, res);
  } catch (error) {
    console.error('Reset password route error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// HEAD method for token validation - early token validation without password reset
router.head('/reset-password', async (req, res) => {
  try {
    await verifyEmail(req.db, req, res);
  } catch (error) {
    console.error('Token validation route error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

module.exports = router;