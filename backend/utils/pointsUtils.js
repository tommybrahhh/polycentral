// utils/pointsUtils.js

/**
 * Updates user points and logs the transaction in points_history.
 * This is the single source of truth for all point modifications.
 * @param {object} dbClient - The database client OR pool object.
 * @param {number} userId - The user ID.
 * @param {number} amount - The amount to add/subtract (positive/negative).
 * @param {string} reason - Reason for the transaction ('event_entry', 'event_win', etc.).
 * @param {number|null} eventId - Optional event ID if related to an event.
 * @returns {Promise<number>} The user's new point balance.
 */
async function updateUserPoints(dbClient, userId, amount, reason, eventId = null) {
  // NOTE: This function can run within an existing transaction if `dbClient` is a
  // connected client, or it can create its own transaction if `dbClient` is the pool.
  // The provided `server.js` correctly passes a connected client.

  const isPostgres = dbClient.constructor.name === 'PoolClient' || process.env.DATABASE_URL?.startsWith('postgres');

  try {
    // Lock the user row to prevent race conditions (only works in PostgreSQL).
    const lockClause = isPostgres ? 'FOR UPDATE' : '';
    const userResult = await dbClient.query(`SELECT points FROM users WHERE id = $1 ${lockClause}`, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    const currentBalance = userResult.rows[0].points;
    const newBalance = currentBalance + amount;

    // 1. Update the user's total points in the 'users' table.
    await dbClient.query('UPDATE users SET points = $1 WHERE id = $2', [newBalance, userId]);

    // 2. Log the transaction in the 'points_history' table.
    await dbClient.query(
      `INSERT INTO points_history (user_id, change_amount, new_balance, reason, event_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, amount, newBalance, reason, eventId]
    );

    console.log(`POINTS_LOG: User ${userId}, Reason: ${reason}, Change: ${amount}, New Balance: ${newBalance}`);

    // FIX: Return the new balance as a number directly.
    return newBalance;

  } catch (error) {
    console.error(`Points update failed for user ${userId}:`, error);
    // Re-throw the error so the calling function's transaction will roll back.
    throw error;
  }
}

// In your `server.js` file, you are passing the pool object instead of a client in some places.
// To make the utility more robust, we'll create a wrapper for standalone calls.
async function updateUserPointsWithPool(pool, ...args) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const newBalance = await updateUserPoints(client, ...args);
        await client.query('COMMIT');
        return newBalance;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}


module.exports = {
  updateUserPoints,
  updateUserPointsWithPool // Export the wrapper too, just in case
};