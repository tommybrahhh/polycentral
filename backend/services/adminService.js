// adminService.js - Admin business logic functions extracted from adminController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getCurrentPrice } = require('./coingeckoService');
const { updateUserPoints } = require('../utils/pointsUtils');
const { manualResolveEvent: eventServiceManualResolveEvent } = require('./eventService');
const { distributePayouts } = require('../distribute_payouts');

// Admin service for manual event creation
async function createEvent(db, eventData) {
  const {
    title,
    description,
    category,
    options,
    entry_fee,
    max_participants,
    start_time,
    end_time,
    crypto_symbol,
    initial_price,
    prediction_window,
  } = eventData;

  // Validate required fields
  if (!title || !options || entry_fee === undefined || !start_time || !end_time) {
    throw new Error('Missing required fields: title, options, entry_fee, start_time, end_time');
  }

  // Validate entry fee
  if (entry_fee < 100 || entry_fee % 25 !== 0) {
    throw new Error('Entry fee must be at least 100 points and divisible by 25');
  }

  // Validate dates
  const startTime = new Date(start_time);
  const endTime = new Date(end_time);
  
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error('Invalid date format for start_time or end_time');
  }

  if (endTime <= startTime) {
    throw new Error('End time must be after start time');
  }

  // Validate options is a valid JSON array
  let parsedOptions;
  try {
    parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
    if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
      throw new Error('Options must be a non-empty array');
    }
  } catch (error) {
    throw new Error('Invalid options format. Must be a valid JSON array');
  }

  // Check for existing event with same title
  const existingEvent = await db.raw(
    'SELECT * FROM events WHERE title = ?',
    [title]
  );
  
  if (existingEvent.rows.length > 0) {
    throw new Error('Event title already exists');
  }

  // Look up event type 'prediction'
  const typeQuery = await db.raw(`SELECT id FROM event_types WHERE name = 'prediction'`);
  if (typeQuery.rows.length === 0) {
    throw new Error("Event type 'prediction' not found");
  }
  const eventTypeId = typeQuery.rows[0].id;

  // Get current price if initial_price is not provided
  let finalInitialPrice = initial_price;
  if (!finalInitialPrice && crypto_symbol) {
    try {
      finalInitialPrice = await getCurrentPrice(crypto_symbol);
    } catch (error) {
      console.warn('Failed to fetch current price, using default:', error.message);
      finalInitialPrice = 50000; // Default price
    }
  }

  // Create new event with all parameters
  const { rows: [newEvent] } = await db.raw(
    `INSERT INTO events (
      title, description, category, options, entry_fee, max_participants,
      start_time, end_time, crypto_symbol, initial_price, prediction_window,
      event_type_id, status, resolution_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending')
    RETURNING *`,
    [
      title,
      description || '',
      category || 'crypto',
      JSON.stringify(parsedOptions),
      entry_fee,
      max_participants || 100,
      startTime,
      endTime,
      crypto_symbol || 'bitcoin',
      finalInitialPrice || 50000,
      prediction_window || '24 hours',
      eventTypeId
    ]
  );

  return newEvent;
}

// Admin service to get total platform fees
async function getTotalPlatformFees(db) {
  const result = await db.raw('SELECT COALESCE(SUM(platform_fee), 0) as total_fees FROM events');
  const totalFees = parseInt(result.rows[0].total_fees) || 0;
  return { total_platform_fees: totalFees };
}

// Admin service to get all events with pagination and filtering
async function getEvents(db, queryParams) {
  const { page = 1, limit = 10, search = '', status = 'all' } = queryParams;
  
  // Start a query builder on the 'events' table
  const query = db('events as e');

  // Add columns and subqueries safely
  query.select(
    'e.*',
    db.raw('(SELECT COUNT(*) FROM participants WHERE event_id = e.id) as participant_count'),
    db.raw('COALESCE((SELECT SUM(amount) FROM participants WHERE event_id = e.id), 0) as total_pot')
  );

  // Add search filter (Case insensitive)
  if (search) {
    // Use generic 'like' for broad compatibility, or whereILike if Knex version supports it
    query.where(function() {
      this.where('e.title', 'like', `%${search}%`)
          .orWhere('e.title', 'ilike', `%${search}%`); // Try both for safety
    });
  }

  // Add status filter
  if (status !== 'all') {
    if (status === 'pending') {
      query.where('e.resolution_status', 'pending');
    } else if (status === 'resolved') {
      query.where('e.resolution_status', 'resolved');
    } else if (status === 'active') {
      query.where('e.status', 'active');
    }
  }

  // 1. Get Total Count for Pagination (using a clone of the query to ignore limit/offset)
  // We clear the select to just count rows matching the filters
  const countQuery = query.clone().clearSelect().count('* as count').first();
  const countResult = await countQuery;
  const total = parseInt(countResult ? (countResult.count || countResult['count(*)']) : 0);

  // 2. Get Data with Pagination
  query.orderBy('e.created_at', 'desc')
       .limit(limit)
       .offset((page - 1) * limit);

  const events = await query;

  return {
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Admin service to get event participants
async function getEventParticipants(db, eventId) {
  // Validate event ID
  if (!eventId || isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  // Get participants for the event with user information
  const { rows: participants } = await db.raw(`
    SELECT
      p.id,
      p.user_id,
      u.username,
      p.prediction,
      p.amount,
      p.created_at,
      o.result as outcome,
      o.points_awarded
    FROM participants p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN event_outcomes o ON p.id = o.participant_id
    WHERE p.event_id = ?
    ORDER BY p.created_at DESC
  `, [eventId]);

  return participants;
}

// Admin service for event templates (placeholder - returns empty array for now)
async function getEventTemplates() {
  // For now, return empty array as templates functionality isn't implemented yet
  return [];
}

// Admin user management services
async function getUsers(db, queryParams) {
  const { page = 1, limit = 10, search = '' } = queryParams;
  
  // 1. Start Query Builder
  const query = db('users');

  // 2. Select specific columns (security best practice)
  query.select(
    'id', 'username', 'email', 'points', 'is_admin', 'is_suspended',
    'total_events', 'won_events', 'last_login_date', 'created_at'
  );

  // 3. Apply Search Filter (Case Insensitive)
  if (search) {
    query.where(function() {
      this.where('username', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`)
          // Try ilike for Postgres, fallback to like for others automatically
          .orWhere('username', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
    });
  }

  // 4. Get Total Count (before pagination)
  const countQuery = query.clone().clearSelect().count('* as count').first();
  const countResult = await countQuery;
  const total = parseInt(countResult ? (countResult.count || countResult['count(*)']) : 0);

  // 5. Apply Pagination & Sorting
  query.orderBy('created_at', 'desc')
       .limit(limit)
       .offset((page - 1) * limit);

  const users = await query;

  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

async function getUserDetails(db, userId) {
  // Validate user ID
  if (!userId || isNaN(userId)) {
    throw new Error('Invalid user ID');
  }
  
  const { rows } = await db.raw(`
    SELECT
      id, username, email, points, is_admin, is_suspended,
      total_events, won_events, last_login_date, created_at
    FROM users
    WHERE id = ?
  `, [userId]);
  
  if (rows.length === 0) {
    throw new Error('User not found');
  }
  
  return rows[0];
}

async function adjustUserPoints(db, userId, points, reason, adminId) {
  // Validate input
  if (!userId || isNaN(userId)) {
    throw new Error('Invalid user ID');
  }
  
  if (typeof points !== 'number') {
    throw new Error('Points must be a number');
  }
  
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('Reason is required');
  }
  
  const trx = await db.transaction();
  
  try {
    // Get current points
    const { rows: userRows } = await trx.raw(
      'SELECT points, username FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (userRows.length === 0) {
      await trx.rollback();
      throw new Error('User not found');
    }
    
    const currentPoints = userRows[0].points;
    const username = userRows[0].username;
    const newPoints = currentPoints + points;
    
    // Update user points
    await trx.raw(
      'UPDATE users SET points = ? WHERE id = ?',
      [newPoints, userId]
    );
    
    // Log the adjustment in audit_logs
    await trx.raw(
      `INSERT INTO audit_logs (action, details) VALUES ('points_adjustment', ?) `,
      [JSON.stringify({
        admin_id: adminId,
        user_id: userId,
        user_username: username,
        points_adjustment: points,
        reason: reason.trim(),
        points_before: currentPoints,
        points_after: newPoints,
        timestamp: new Date().toISOString()
      })]
    );
    
    await trx.commit();
    
    return {
      points_adjusted: points,
      new_total: newPoints,
      user_id: userId,
      user_username: username
    };
    
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

async function updateUserRole(db, userId, is_admin) {
  // Validate input
  if (!userId || isNaN(userId)) {
    throw new Error('Invalid user ID');
  }
  
  if (typeof is_admin !== 'boolean') {
    throw new Error('is_admin must be a boolean');
  }
  
  const { rows } = await db.raw(
    'UPDATE users SET is_admin = ? WHERE id = ? RETURNING id, username, is_admin',
    [is_admin, userId]
  );
  
  if (rows.length === 0) {
    throw new Error('User not found');
  }
  
  return {
    user_id: userId,
    username: rows[0].username,
    is_admin: rows[0].is_admin
  };
}

async function suspendUser(db, userId, is_suspended) {
  // Validate input
  if (!userId || isNaN(userId)) {
    throw new Error('Invalid user ID');
  }
  
  if (typeof is_suspended !== 'boolean') {
    throw new Error('is_suspended must be a boolean');
  }
  
  const { rows } = await db.raw(
    'UPDATE users SET is_suspended = ? WHERE id = ? RETURNING id, username, is_suspended',
    [is_suspended, userId]
  );
  
  if (rows.length === 0) {
    throw new Error('User not found');
  }
  
  return {
    user_id: userId,
    username: rows[0].username,
    is_suspended: rows[0].is_suspended
  };
}

async function resetUserClaims(db, userId) {
  // Validate user ID
  if (!userId || isNaN(userId)) {
    throw new Error('Invalid user ID');
  }
  
  const { rows } = await db.raw(
    'UPDATE users SET last_claimed = NULL WHERE id = ? RETURNING id, username',
    [userId]
  );
  
  if (rows.length === 0) {
    throw new Error('User not found');
  }
  
  return {
    user_id: userId,
    username: rows[0].username
  };
}

// Admin service to resolve event using pool logic (Instruction Set 3)
async function resolveEventWithPoolLogic(db, eventId, winningOutcome) {
  const trx = await db.transaction();
  
  try {
    // Validate event exists and is in correct state
    const { rows: eventRows } = await trx.raw(`
      SELECT id, status, resolution_status
      FROM events
      WHERE id = ?
      FOR UPDATE
    `, [eventId]);

    if (eventRows.length === 0) {
      await trx.rollback();
      throw new Error('Event not found');
    }

    const event = eventRows[0];
    
    // Check event status (must be LOCKED or OPEN, not RESOLVED)
    if (event.resolution_status === 'resolved') {
      await trx.rollback();
      throw new Error('Event is already RESOLVED');
    }

    if (event.status !== 'LOCKED' && event.status !== 'OPEN') {
      await trx.rollback();
      throw new Error('Event must be in LOCKED or OPEN state to resolve');
    }

    // Get all bets for this event
    const betsQuery = await trx.raw(`
      SELECT p.*, u.username
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.event_id = ?
    `, [eventId]);

    const allBets = betsQuery.rows;
    
    if (allBets.length === 0) {
      await trx.rollback();
      throw new Error('No bets found for this event');
    }

    // Calculate pools
    const totalPool = allBets.reduce((sum, bet) => sum + bet.amount, 0);
    const winningBets = allBets.filter(bet => bet.prediction === winningOutcome);
    const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

    // Calculate platform fee (5%) and remaining pot
    const platformFeePercentage = 0.05;
    const platformFee = Math.floor(totalPool * platformFeePercentage);
    const remainingPot = totalPool - platformFee;

    // Update event with platform fee
    await trx.raw(`
      UPDATE events
      SET platform_fee = platform_fee + ?
      WHERE id = ?
    `, [platformFee, eventId]);

    // Distribute payouts to winners
    if (winningBets.length > 0) {
      for (const bet of winningBets) {
        const userPayout = Math.floor((bet.amount / winningPool) * remainingPot);
        
        if (userPayout > 0) {
          // Update user points using centralized utility
          await updateUserPoints(trx, bet.user_id, userPayout, 'event_win', eventId);
          
          // Record platform fee contribution for this participant
          const participantFee = Math.floor(bet.amount * platformFeePercentage);
          await trx.raw(`
            INSERT INTO platform_fees (event_id, participant_id, fee_amount)
            VALUES (?, ?, ?)
          `, [eventId, bet.id, participantFee]);
          
          // Record winning outcome
          await trx.raw(`
            INSERT INTO event_outcomes (participant_id, result, points_awarded)
            VALUES (?, 'win', ?)
          `, [bet.id, userPayout]);
        }
      }
    }

    // Record losing outcomes for non-winners
    const losingBets = allBets.filter(bet => bet.prediction !== winningOutcome);
    if (losingBets.length > 0) {
      for (const bet of losingBets) {
        await trx.raw(`
          INSERT INTO event_outcomes (participant_id, result, points_awarded)
          VALUES (?, 'loss', 0)
        `, [bet.id]);
      }
    }

    // Update event status to resolved
    await trx.raw(`
      UPDATE events
      SET resolution_status = 'resolved',
          status = 'RESOLVED',
          correct_answer = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [winningOutcome, eventId]);

    // Add audit log entry
    await trx.raw(`
      INSERT INTO audit_logs (event_id, action, details)
      VALUES (?, 'manual_payout_distribution', ?)
    `, [eventId, JSON.stringify({
      totalParticipants: allBets.length,
      totalWinners: winningBets.length,
      totalPot: totalPool,
      platformFee: platformFee,
      distributed: remainingPot,
      resolvedAt: new Date().toISOString(),
      winningOutcome: winningOutcome,
      resolvedBy: 'admin_api'
    })]);

    await trx.commit();
    return {
      success: true,
      message: `Event ${eventId} resolved successfully with outcome: ${winningOutcome}`,
      details: {
        totalParticipants: allBets.length,
        totalWinners: winningBets.length,
        totalPot: totalPool,
        platformFee: platformFee,
        distributed: remainingPot
      }
    };
    
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

// Admin service for manual event resolution
async function manualResolveEvent(db, trx, eventId, correct_answer, final_price, clients, WebSocket) {
  // Validate input
  if (!correct_answer) {
    throw new Error('correct_answer is required');
  }

  const validAnswers = ['Higher', 'Lower', '0-3% up', '3-5% up', '5%+ up', '0-3% down', '3-5% down', '5%+ down'];
  if (!validAnswers.includes(correct_answer)) {
    throw new Error('Invalid correct_answer. Must be one of: ' + validAnswers.join(', '));
  }

  if (final_price && (typeof final_price !== 'number' || final_price <= 0)) {
    throw new Error('final_price must be a positive number if provided');
  }

  const result = await eventServiceManualResolveEvent(
    db,
    trx,
    eventId,
    correct_answer,
    final_price,
    clients,
    WebSocket
  );
  
  return result;
}

// Admin service to suspend or unsuspend an event
async function suspendEvent(db, eventId, is_suspended) {
  // Validate input
  if (!eventId || isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  if (typeof is_suspended !== 'boolean') {
    throw new Error('is_suspended must be a boolean value');
  }

  // Update the event's status and is_suspended flag in the database
  const { rows } = await db.raw(
    `UPDATE events
     SET is_suspended = ?, status = ?
     WHERE id = ?
     RETURNING id, title, is_suspended, status`,
    [is_suspended, is_suspended ? 'suspended' : 'active', eventId]
  );

  if (rows.length === 0) {
    throw new Error('Event not found');
  }

  return {
    event: rows[0],
    message: is_suspended ? 'Event suspended successfully' : 'Event unsuspended successfully'
  };
}

// Admin service to delete an event and its associated participants
async function deleteEvent(db, eventId) {
  // Validate input
  if (!eventId || isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  const trx = await db.transaction();

  try {
    // Step 1: Delete associated participants first to avoid foreign key violations.
    await trx.raw('DELETE FROM participants WHERE event_id = ?', [eventId]);
    
    // NOTE: If other tables like 'event_outcomes' or 'audit_logs' also reference 'events',
    // you would add similar DELETE statements for them here.

    // Step 2: Delete the event itself.
    const result = await trx.raw('DELETE FROM events WHERE id = ?', [eventId]);

    if (result.rowCount === 0) {
      // If the event didn't exist, no harm done, but we should rollback and inform the user.
      await trx.rollback();
      throw new Error('Event not found');
    }

    // Step 3: If both deletions were successful, commit the transaction.
    await trx.commit();
    
    return { message: 'Event and all its participants deleted successfully' };

  } catch (error) {
    // If any step fails, roll back the entire transaction.
    await trx.rollback();
    throw new Error('Failed to delete event: ' + error.message);
  }
}

// Admin service to transfer platform fees to a user
async function transferPlatformFees(db, userId, amount, reason, adminId) {
  // Validate input
  if (!userId || !amount) {
    throw new Error('userId and amount are required');
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  
  const trx = await db.transaction();
  try {
    // Get total platform fees
    const totalFeesResult = await trx.raw('SELECT COALESCE(SUM(platform_fee), 0) as total_fees FROM events');
    const totalFees = parseInt(totalFeesResult.rows[0].total_fees) || 0;
    
    if (amount > totalFees) {
      await trx.rollback();
      throw new Error('Insufficient platform fees. Available: ' + totalFees);
    }
    
    // Check if user exists
    const userResult = await trx.raw('SELECT id, username, points FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0) {
      await trx.rollback();
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const userBeforePoints = user.points;
    
    // Transfer points to user using centralized function
    const newBalance = await updateUserPoints(db, userId, amount, 'platform_fee_transfer', null);
    
    // Log the transfer in audit_logs
    await trx.raw(
      `INSERT INTO audit_logs (action, details) VALUES ('platform_fee_transfer', ?)`,
      [JSON.stringify({
        admin_id: adminId || 'unknown',
        user_id: userId,
        user_username: user.username,
        amount: amount,
        reason: reason || 'Admin transfer',
        user_points_before: userBeforePoints,
        user_points_after: userBeforePoints + amount,
        timestamp: new Date().toISOString()
      })]
    );
    
    await trx.commit();
    
    return {
      amount_transferred: amount,
      user_id: userId,
      user_username: user.username,
      user_points_before: userBeforePoints,
      user_points_after: userBeforePoints + amount
    };
  } catch (error) {
    await trx.rollback();
    throw new Error('Failed to transfer platform fees: ' + error.message);
  }
}

// Admin service to get platform metrics
async function getMetrics(db) {
  const totalEventsQuery = await db.raw('SELECT COUNT(*) FROM events');
  const activeEventsQuery = await db.raw(
    'SELECT COUNT(*) FROM events WHERE resolution_status = ?',
    ['pending']
  );
  const completedEventsQuery = await db.raw(
    'SELECT COUNT(*) FROM events WHERE resolution_status = ?',
    ['resolved']
  );
  const totalFeesQuery = await db.raw(
    'SELECT COALESCE(SUM(platform_fee), 0) FROM events'
  );
  const pendingEventsQuery = await db.raw(
    'SELECT COUNT(*) FROM events WHERE resolution_status = ? AND end_time < NOW()',
    ['pending']
  );

  return {
    totalEvents: parseInt(totalEventsQuery.rows[0].count),
    activeEvents: parseInt(activeEventsQuery.rows[0].count),
    completedEvents: parseInt(completedEventsQuery.rows[0].count),
    totalFees: parseInt(totalFeesQuery.rows[0].coalesce),
    pendingEvents: parseInt(pendingEventsQuery.rows[0].count)
  };
}

module.exports = {
  createEvent,
  getTotalPlatformFees,
  getEvents,
  getEventParticipants,
  getEventTemplates,
  getUsers,
  getUserDetails,
  adjustUserPoints,
  updateUserRole,
  suspendUser,
  resetUserClaims,
  manualResolveEvent,
  suspendEvent,
  deleteEvent,
  transferPlatformFees,
  getMetrics,
  resolveEventWithPoolLogic
};