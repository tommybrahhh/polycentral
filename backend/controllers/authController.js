// authController.js - Authentication route handlers using authService layer

const authService = require('../services/authService');

// Registration controller function
async function registerUser(db, req, res) {
  console.log('Registration request received:', req.body);
  const { username, email, password } = req.body;
  if (!username || !username.trim() || !email || !password) {
      console.log('Missing required fields:', { username: !!username, email: !!email, password: !!password });
      return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  // Make password validation more flexible - only require minimum length and character diversity
  // Allow any special characters and focus on preventing weak passwords rather than enforcing specific ones
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
      console.log('Password does not meet requirements:', password);
      return res.status(400).json({
        error: 'Password must contain at least 8 characters, including uppercase, lowercase, and numeric characters. Special characters are allowed but not required.'
      });
  }

  try {
    const result = await authService.registerUser(db, req, res);
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// Login controller function
async function loginUser(db, req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
  try {
    const result = await authService.loginUser(db, req, res);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Invalid credentials')) {
      return res.status(401).json({ error: error.message });
    }
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// Forgot password controller function
async function forgotPassword(db, req, res) {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    try {
      const result = await authService.forgotPassword(db, req, res);
      res.json(result);
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

// Reset password controller function
async function resetPassword(db, req, res) {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Token, new password, and confirm password are required' });
    }

    // Validate password matching
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate password strength (same as registration but with special character requirement)
    // Updated to match test expectations: at least 8 chars, uppercase, lowercase, number, and special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[][{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must contain at least 8 characters, including uppercase, lowercase, numeric, and special characters.'
      });
    }

    try {
      const result = await authService.resetPassword(db, req, res);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Invalid or expired reset token')) {
        return res.status(400).json({ error: error.message });
      }
      console.error('Password reset confirmation error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

// Token validation controller function (for HEAD /reset-password)
async function verifyEmail(db, req, res) {
  try {
    // Extract token from X-Token-Validation header
    const token = req.headers['x-token-validation'];
    
    if (!token) {
      return res.status(400).json({ error: 'X-Token-Validation header is required' });
    }

    try {
      const result = await authService.verifyEmail(db, req, res);
      res.status(200).end();
    } catch (error) {
      if (error.message.includes('Invalid or expired reset token')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('Token validation error:', error);
      res.status(500).json({ error: 'Failed to validate token' });
    }

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
}

module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    verifyEmail
};