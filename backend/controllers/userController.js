// backend/controllers/userController.js - User route handlers using userService layer

const userService = require('../services/userService');

// Controller functions will be exported here

async function changePassword(db, req, res) {
  const userId = req.userId; // This comes from your authenticateToken middleware
  const { currentPassword, newPassword } = req.body;

  // 1. Server-side validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }

  try {
    const result = await userService.changePassword(db, req, res);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Incorrect current password')) {
      return res.status(401).json({ message: error.message });
    }
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}

async function requestEmailChange(db, req, res) {
  try {
    const { newEmail, currentPassword } = req.body;
    const userId = req.userId;

    // Validate input
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    try {
      const result = await userService.requestEmailChange(db, req, res);
      res.json(result);
    } catch (error) {
      if (error.message.includes('User not found') || error.message.includes('Email already in use') || error.message.includes('Current password is incorrect') || error.message.includes('New email cannot be same as current email')) {
        const statusCode = error.message.includes('User not found') ? 404 :
                          error.message.includes('Email already in use') ? 409 :
                          error.message.includes('Current password is incorrect') ? 401 : 400;
        return res.status(statusCode).json({ error: error.message });
      }
      console.error('Email change request error:', error);
      res.status(500).json({ error: 'Failed to process email change request' });
    }

  } catch (error) {
    console.error('Email change request error:', error);
    res.status(500).json({ error: 'Failed to process email change request' });
  }
}

async function verifyEmailChange(db, req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
      const result = await userService.verifyEmailChange(db, req, res);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Invalid or expired verification token')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Failed to verify email change' });
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email change' });
  }
}

async function getPointsHistory(db, req, res) {
  try {
    const result = await userService.getPointsHistory(db, req, res);
    res.json(result);
  } catch (error) {
    console.error('Error fetching points history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function claimFreePoints(db, req, res) {
  console.log('Claim free points request received for user:', req.userId);
  
  if (!req.userId) {
    console.error('Error: req.userId is undefined or null in claim-free-points endpoint');
    return res.status(400).json({ error: 'User ID not available' });
  }

  try {
    const result = await userService.claimFreePoints(db, req, res);
    res.json(result);
  } catch (error) {
    if (error.message.includes('User not found') || error.message.includes('User data is invalid')) {
      const statusCode = error.message.includes('User not found') ? 404 : 500;
      return res.status(statusCode).json({ error: error.message });
    }
    if (error.message.includes('You already claimed free points today')) {
      return res.status(400).json({ 
        message: error.message,
        hoursRemaining: error.hoursRemaining,
        lastClaimed: error.lastClaimed,
        currentTime: error.currentTime
      });
    }
    console.error('Error during transaction, rolled back.', error);
    res.status(500).json({ error: 'Failed to claim points due to a database error.' });
  }
}

async function getUserProfile(db, req, res) {
  try {
    const result = await userService.getUserProfile(db, req, res);
    res.json(result);
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserHistory(db, req, res) {
  try {
    const result = await userService.getUserHistory(db, req, res);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user prediction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDebugUsers(db, req, res) {
  try {
    const result = await userService.getDebugUsers(db, req, res);
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateDebugToken(db, req, res) {
  try {
    const result = await userService.generateDebugToken(db, req, res);
    res.json(result);
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  claimFreePoints,
  getUserProfile,
  getUserHistory,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  getPointsHistory,
  getDebugUsers,
  generateDebugToken
};
