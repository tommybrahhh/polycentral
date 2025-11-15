const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { updateUserPoints } = require('../utils/pointsUtils');
const { generateVerificationToken, getExpirationTime, sendVerificationEmail } = require('../utils/emailUtils');

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
    // 2. Fetch the user's current HASHED password from the database
    // This MUST match your 'users' table schema. It is 'password_hash'.
    const userResult = await db.raw(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const storedHashedPassword = userResult.rows[0].password_hash;

    // 3. Securely compare the provided current password with the stored hash
    const isMatch = await bcrypt.compare(currentPassword, storedHashedPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 4. Hash the new password before saving it
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    // 5. Update the 'password_hash' column in the database
    await db.raw(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHashedPassword, userId]
    );

    // 6. Send a success response
    res.status(200).json({ message: 'Password changed successfully!' });

  } catch (error) {
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

    // Check if new email is same as current email
    const { rows: [user] } = await db.raw(
      'SELECT email, password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email === newEmail) {
      return res.status(400).json({ error: 'New email cannot be same as current email' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new email is already in use
    const { rows: existingUser } = await db.raw(
      'SELECT id FROM users WHERE email = ?',
      [newEmail]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Generate verification token and expiration
    const verificationToken = generateVerificationToken();
    const expiresAt = getExpirationTime();

    // Store verification request in database
    await db.raw(
      `INSERT INTO email_change_verifications (user_id, new_email, verification_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, newEmail, verificationToken, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail(newEmail, verificationToken);

    res.json({
      message: 'Verification email sent! Please check your new email address to complete the process.',
      expiresAt: expiresAt.toISOString()
    });

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

    // Find and validate verification token
    const { rows: [verification] } = await db.raw(
      `SELECT * FROM email_change_verifications
       WHERE verification_token = ? AND expires_at > NOW() AND used = FALSE`,
      [token]
    );

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const trx = await db.transaction();
    try {
      // Update user's email
      const { rows: [updatedUser] } = await trx.raw(
        'UPDATE users SET email = ? WHERE id = ? RETURNING id, email, username',
        [verification.new_email, verification.user_id]
      );

      // Mark token as used
      await trx.raw(
        'UPDATE email_change_verifications SET used = TRUE WHERE id = ?',
        [verification.id]
      );

      // Clean up expired tokens for this user
      await trx.raw(
        'DELETE FROM email_change_verifications WHERE user_id = ? AND (expires_at <= NOW() OR used = TRUE)',
        [verification.user_id]
      );

      await trx.commit();

      res.json({
        success: true,
        message: 'Email address successfully updated!',
        user: updatedUser
      });

    } catch (error) {
      await trx.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email change' });
  }
}

async function getPointsHistory(db, req, res) {
  try {
    const userId = req.userId;
    
    // Query to get all points history for the logged-in user
    const { rows } = await db.raw(
      `SELECT change_amount, new_balance, reason, event_id, created_at
       FROM points_history
       WHERE user_id = ?
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json(rows);
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

  const { rows: claimCheck } = await db.raw(
    `SELECT id, points, last_claimed, last_login_date FROM users WHERE id = ?`,
    [req.userId]
  );

  console.log('User claim check result:', claimCheck);
  
  if (!Array.isArray(claimCheck) || claimCheck.length === 0) {
    console.log('User not found in database for claim request or query failed to return rows');
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!claimCheck[0]) {
    console.error('User object is undefined or null for user:', req.userId);
    return res.status(500).json({ error: 'User data is invalid' });
  }

  const user = claimCheck[0];
  const lastClaimed = user.last_claimed || user.last_claim_date;
  const now = new Date();
  
  console.log('User details:', {
    id: user.id,
    points: user.points,
    last_claimed: lastClaimed,
    last_login_date: user.last_login_date
  });

  console.log('Last claimed time:', lastClaimed);
  console.log('Current time:', now);

  if (lastClaimed) {
    const lastClaimedDate = new Date(lastClaimed);
    
    if (isNaN(lastClaimedDate.getTime())) {
      console.log('Invalid last claimed date, treating as no previous claim');
    } else {
      const timeDifference = now - lastClaimedDate;
      const hoursSinceLastClaim = timeDifference / (1000 * 60 * 60);
      
      console.log('Time calculation details:', {
        now: now.toISOString(),
        lastClaimed: lastClaimedDate.toISOString(),
        timeDifference: timeDifference,
        hoursSinceLastClaim: hoursSinceLastClaim,
      });
      
      if (hoursSinceLastClaim < 24) {
        console.log('User attempted to claim points within 24 hours');
        return res.status(400).json({
          message: 'You already claimed free points today',
          hoursRemaining: Math.ceil(24 - hoursSinceLastClaim),
          lastClaimed: lastClaimed,
          currentTime: now
        });
      }
    }
  }

  console.log('Awarding 250 points to user:', req.userId);
  
  const trx = await db.transaction();
  try {
    const pointsToAward = 250;
    const newBalance = await updateUserPoints(trx, req.userId, pointsToAward, 'daily_claim', null);
    
    const { rows: [updatedUser] } = await trx.raw(
      `UPDATE users
       SET last_claimed = NOW(), last_login_date = NOW()
       WHERE id = ?
       RETURNING id, username`,
      [req.userId]
    );
    updatedUser.points = newBalance;

    await trx.commit();
    
    console.log('Successfully awarded points to user:', {
      userId: req.userId,
      pointsAwarded: pointsToAward,
      newTotal: updatedUser.points
    });
    
    res.json({
      message: 'Successfully claimed free points!',
      points: pointsToAward,
      newTotal: updatedUser.points
    });
  } catch (transactionError) {
    await trx.rollback();
    console.error('Error during transaction, rolled back.', transactionError);
    res.status(500).json({ error: 'Failed to claim points due to a database error.' });
  }
}

async function getUserProfile(db, req, res) {
  try {
    const { rows } = await db.raw(
      'SELECT id, username, email, points, is_admin FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
          console.error('Error fetching user profile:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  }
  
  async function getUserHistory(db, req, res) {
    try {
      const userId = req.userId;
      
      const participantCheck = await db.raw(
        `SELECT id, event_id, prediction, amount FROM participants WHERE user_id = ?`,
        [userId]
      );
      console.log(`Participants for user ${userId}:`, JSON.stringify(participantCheck.rows, null, 2));
      
      const outcomeCheck = await db.raw(
        `SELECT * FROM event_outcomes LIMIT 10`
      );
      console.log('Event outcomes table contents (first 10 rows):', JSON.stringify(outcomeCheck.rows, null, 2));
      
      const { rows } = await db.raw(
        `SELECT
           p.id AS participation_id,
           e.id AS event_id,
           e.title,
           e.initial_price,
           e.final_price,
           e.crypto_symbol,
           e.resolution_status,
           e.start_time,
           e.end_time,
           e.correct_answer,
           p.prediction,
           p.amount AS entry_fee,
           o.result,
           o.points_awarded,
           CASE
             WHEN e.resolution_status = 'resolved' THEN
               CASE
                 WHEN p.prediction = e.correct_answer THEN 'win'
                 ELSE 'loss'
               END
             ELSE 'pending'
           END AS resolution_state,
           a.details AS resolution_details
         FROM participants p
         JOIN events e ON p.event_id = e.id
         LEFT JOIN event_outcomes o ON p.id = o.participant_id
         LEFT JOIN audit_logs a ON e.id = a.event_id AND a.action = 'event_resolution'
         WHERE p.user_id = ?
         ORDER by e.start_time DESC`,
        [userId]
      );
      
      console.log(`User history query for user ${userId}:`, JSON.stringify(rows, null, 2));
      
      res.json(rows);
    } catch (error) {
      console.error('Error fetching user prediction history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async function getDebugUsers(db, req, res) {
    try {
      const { rows } = await db.raw('SELECT id, username, email, points FROM users LIMIT 10');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async function generateDebugToken(db, req, res) {
    try {
      const userId = req.params.userId;
      const token = jwt.sign({ userId: parseInt(userId) }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
      res.json({ token, userId });
    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

module.exports = {
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  getPointsHistory,
  claimFreePoints,
  getUserProfile,
  getUserHistory,
  getDebugUsers,
  generateDebugToken
};