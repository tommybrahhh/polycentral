// Centralized point management utilities

/**
 * Updates user points and logs the transaction in points_history
 * @param {object} pool - The database pool object
 * @param {number} userId - The user ID
 * @param {number} amount - The amount to add/subtract (positive/negative)
 * @param {string} reason - Reason for the transaction ('event_entry', 'event_win', 'daily_claim', 'initial_balance')
 * @param {number|null} eventId - Optional event ID if related to an event
 * @returns {Promise<{success: boolean, newBalance: number}>}
 */
async function updateUserPoints(pool, userId, amount, reason, eventId = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start a transaction

    // Lock the user row to prevent race conditions, and get current balance
    const userResult = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const currentBalance = userResult.rows[0].points;
    const newBalance = currentBalance + amount;

    // 1. Update the user's total points in the 'users' table
    await client.query('UPDATE users SET points = $1 WHERE id = $2', [newBalance, userId]);

    // 2. Log the transaction in the 'points_history' table
    await client.query(
      `INSERT INTO points_history (user_id, change_amount, new_balance, reason, event_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, amount, newBalance, reason, eventId]
    );

    await client.query('COMMIT'); // Commit both changes if successful
    return { success: true, newBalance };

  } catch (error) {
    await client.query('ROLLBACK'); // Revert all changes if an error occurs
    console.error('Points update transaction failed:', error);
    throw error;
  } finally {
    client.release(); // Release the client back to the pool
  }
}

module.exports = {
  updateUserPoints
};