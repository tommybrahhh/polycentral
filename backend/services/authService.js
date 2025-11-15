const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailUtils');
const { updateUserPoints } = require('../utils/pointsUtils');

// Registration service function
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

  // Check for existing username or email
  try {
    const existingUser = await db.raw(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR email = ?',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      const conflictField = existingUser.rows[0].username === username ? 'username' : 'email';
      return res.status(409).json({ error: `${conflictField} already exists` });
    }
  } catch (error) {
    console.error('❌ Pre-validation error:', error);
    return res.status(500).json({ error: 'Server error during validation' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const trx = await db.transaction(); // Start a transaction
    try {
      
      // Create user with default points (0)
      const [newUser] = await trx('users').insert(
        { username: username.toLowerCase(), email, password_hash: passwordHash, last_login_date: new Date() },
        ['id', 'username', 'email', 'points']
      );
      
      // Award starting points using centralized function
      const startingPoints = 1000; // Give new users 1000 starting points
      const newBalance = await updateUserPoints(trx, newUser.id, startingPoints, 'registration', null);
      
      await trx.commit(); // Commit the transaction
      
      // Ensure username is returned in original case for the response
      newUser.username = username;
      newUser.points = newBalance; // Update with the new balance after points award
      
      const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: newUser });
    } catch (error) {
      await trx.rollback(); // Rollback the transaction on error
      throw error;
    }
  } catch (error) {
    if (error.code === '23505') {
      // Handle unique constraint violation
      if (error.constraint === 'users_username_unique') {
        return res.status(409).json({ error: 'Username already exists' });
      } else if (error.constraint === 'users_email_key') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(409).json({ error: 'Duplicate key violation' });
    }
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// Login service function
async function loginUser(db, req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
  try {
    const { rows: [user] } = await db.raw('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR email = ?', [identifier, identifier]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Update last login date on successful login
    await db.raw('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points } });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// Forgot password service function
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

    // Find user by email
    const result = await db.raw(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );
    // Handle different database result structures (SQLite vs PostgreSQL)
    // Knex returns { rows: [...] } for PostgreSQL and array for SQLite
    let user = null;
    if (result && result.rows && Array.isArray(result.rows)) {
      user = result.rows[0];
    } else if (Array.isArray(result)) {
      user = result[0];
    } else {
      // Handle case where result is an object with rows property that might be undefined
      user = null;
    }

    // If user doesn't exist, return success to prevent email enumeration
    // Use consistent response format and timing to prevent enumeration
    if (!user) {
      console.log('Password reset requested for non-existent email (enumeration protection):', email);
      // Add small delay to prevent timing attacks (50-150ms random delay)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token and expiration
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    // Store hashed token and expiration in database
    await db.raw(
      `UPDATE users
       SET password_reset_token = ?, password_reset_expires = ?
       WHERE id = ?`,
      [hashedToken, expiresAt, user.id]
    );

    // Create reset link
    const resetLink = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send reset email
    await sendPasswordResetEmail(email, resetLink);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

// Reset password service function
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

    // Find user by token (check if token exists and hasn't expired)
    const now = new Date();
    const result = await db.raw(
      `SELECT id, password_reset_token, password_reset_expires
       FROM users
       WHERE password_reset_token IS NOT NULL
       AND password_reset_expires > ?`,
      [now]
    );
    // Handle different database result structures (SQLite vs PostgreSQL)
    // Knex returns { rows: [...] } for PostgreSQL and array for SQLite
    let users = [];
    if (result && result.rows && Array.isArray(result.rows)) {
      users = result.rows;
    } else if (Array.isArray(result)) {
      users = result;
    } else {
      // Handle case where result is an object with rows property that might be undefined
      users = [];
    }

    // Find the user with matching token using bcrypt.compare
    let userWithMatchingToken = null;
    for (const user of users) {
      const isTokenMatch = await bcrypt.compare(token, user.password_reset_token);
      if (isTokenMatch) {
        userWithMatchingToken = user;
        break;
      }
    }

    if (!userWithMatchingToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token fields
    await db.raw(
      `UPDATE users
       SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = ?`,
      [passwordHash, userWithMatchingToken.id]
    );

    res.json({ message: 'Password successfully reset' });

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

// Token validation service function (for HEAD /reset-password)
async function verifyEmail(db, req, res) {
  try {
    // Extract token from X-Token-Validation header
    const token = req.headers['x-token-validation'];
    
    if (!token) {
      return res.status(400).json({ error: 'X-Token-Validation header is required' });
    }

    // Find users with valid reset tokens (not expired)
    const now = new Date();
    const result = await db.raw(
      `SELECT id, password_reset_token, password_reset_expires
       FROM users
       WHERE password_reset_token IS NOT NULL
       AND password_reset_expires > ?`,
      [now]
    );
    
    // Handle different database result structures (SQLite vs PostgreSQL)
    let users = [];
    if (result && result.rows && Array.isArray(result.rows)) {
      users = result.rows;
    } else if (Array.isArray(result)) {
      users = result;
    } else {
      users = [];
    }

    // Find the user with matching token using bcrypt.compare
    let userWithMatchingToken = null;
    for (const user of users) {
      const isTokenMatch = await bcrypt.compare(token, user.password_reset_token);
      if (isTokenMatch) {
        userWithMatchingToken = user;
        break;
      }
    }

    if (!userWithMatchingToken) {
      return res.status(404).json({ error: 'Invalid or expired reset token' });
    }

    // Token is valid - return 200 OK
    res.status(200).end();

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