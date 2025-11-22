// adminController.js - Admin route handlers that delegate to adminService.js

const {
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
  getMetrics
} = require('../services/adminService');

// Admin endpoint for manual event creation
async function adminCreateEvent(req, res) {
  try {
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
    } = req.body;

    // Validate required fields
    if (!title || !options || entry_fee === undefined || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Missing required fields: title, options, entry_fee, start_time, end_time'
      });
    }

    // Validate entry fee
    if (entry_fee < 100 || entry_fee % 25 !== 0) {
      return res.status(400).json({
        error: 'Entry fee must be at least 100 points and divisible by 25'
      });
    }

    // Validate dates
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for start_time or end_time' });
    }

    if (endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Validate options is a valid JSON array
    let parsedOptions;
    try {
      parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
      if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
        throw new Error('Options must be a non-empty array');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid options format. Must be a valid JSON array' });
    }

    const newEvent = await createEvent(req.db, { // Call the imported service function
      title,
      description,
      category,
      options: parsedOptions,
      entry_fee,
      max_participants,
      start_time: startTime,
      end_time: endTime,
      crypto_symbol,
      initial_price,
      prediction_window
    });

    console.log('Admin created new event:', newEvent);
    res.status(201).json({ success: true, data: newEvent });

  } catch (error) {
    console.error('Admin event creation failed:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Event title already exists' });
    }
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
}

// Admin endpoint to get event creation status
async function getEventStatus(req, res) {
  // Reference the global variables (defined in server.js)
  res.json({
    lastAttempt: global.lastEventCreationAttempt,
    lastSuccess: global.lastEventCreationSuccess,
    timeSinceLastAttempt: global.lastEventCreationAttempt ? Date.now() - global.lastEventCreationAttempt.getTime() : null,
    timeSinceLastSuccess: global.lastEventCreationSuccess ? Date.now() - global.lastEventCreationSuccess.getTime() : null
  });
}

// Admin endpoint to get total platform fees
async function handleGetTotalPlatformFees(req, res) {
  try {
    const result = await getTotalPlatformFees(req.db);
    res.json(result);
  } catch (error) {
    console.error('Error fetching total platform fees:', error);
    res.status(500).json({ error: 'Failed to fetch total platform fees' });
  }
}

// Admin endpoint to get all events with pagination and filtering
async function handleGetEvents(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const result = await getEvents(req.db, { page, limit, search, status });
    res.json(result);
  } catch (error) {
    console.error('Error fetching events:', error);
    // CHANGE THIS LINE TO SEE THE REAL ERROR:
    res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message,  // <--- Add this
      hint: error.hint         // <--- Add this (Postgres often gives hints)
    });
  }
}

// Admin endpoint to get event participants
async function handleGetEventParticipants(req, res) {
  try {
    const eventId = req.params.id;
    
    // Validate event ID
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const participants = await getEventParticipants(req.db, eventId);
    res.json(participants);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch event participants' });
  }
}

// Admin endpoint for event templates (placeholder - returns empty array for now)
async function handleGetEventTemplates(req, res) {
  try {
    const templates = await getEventTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching event templates:', error);
    res.status(500).json({ error: 'Failed to fetch event templates' });
  }
}

// Admin user management endpoints
async function handleGetUsers(req, res) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await getUsers(req.db, { page, limit, search });
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function handleGetUserDetails(req, res) {
  try {
    const userId = req.params.id;
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await getUserDetails(req.db, userId);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
}

async function handleAdjustUserPoints(req, res) {
  try {
    const userId = req.params.id;
    const { points, reason } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof points !== 'number') {
      return res.status(400).json({ error: 'Points must be a number' });
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const result = await adjustUserPoints(req.db, userId, points, reason, req.userId);
    res.json({ success: true, ...result });
    
  } catch (error) {
    console.error('Error adjusting user points:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to adjust user points' });
  }
}

async function handleUpdateUserRole(req, res) {
  try {
    const userId = req.params.id;
    const { is_admin } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof is_admin !== 'boolean') {
      return res.status(400).json({ error: 'is_admin must be a boolean' });
    }
    
    const result = await updateUserRole(req.db, userId, is_admin);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

async function handleSuspendUser(req, res) {
  try {
    const userId = req.params.id;
    const { is_suspended } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof is_suspended !== 'boolean') {
      return res.status(400).json({ error: 'is_suspended must be a boolean' });
    }
    
    const result = await suspendUser(req.db, userId, is_suspended);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating user suspension status:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user suspension status' });
  }
}

async function handleResetUserClaims(req, res) {
  try {
    const userId = req.params.id;
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const result = await resetUserClaims(req.db, userId);
    res.json({
      success: true,
      user_id: result.user_id,
      username: result.username,
      message: 'User claims reset successfully'
    });
  } catch (error) {
    console.error('Error resetting user claims:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to reset user claims' });
  }
}

// Admin endpoint for manual event resolution
async function handleManualResolveEvent(req, res, clients, WebSocket) {
  const { correct_answer, final_price } = req.body;
  const eventId = req.params.id;

  try {
    // Validate input
    if (!correct_answer) {
      return res.status(400).json({ error: 'correct_answer is required' });
    }

    const validAnswers = ['Higher', 'Lower', '0-3% up', '3-5% up', '5%+ up', '0-3% down', '3-5% down', '5%+ down'];
    if (!validAnswers.includes(correct_answer)) {
      return res.status(400).json({
        error: 'Invalid correct_answer. Must be one of: ' + validAnswers.join(', ')
      });
    }

    if (final_price && (typeof final_price !== 'number' || final_price <= 0)) {
      return res.status(400).json({ error: 'final_price must be a positive number if provided' });
    }

    const trx = await req.db.transaction(); // Start transaction
    try {
      const result = await manualResolveEvent( // Call the imported service function
        req.db,
        trx,
        eventId,
        correct_answer,
        final_price,
        clients,
        WebSocket
      );
      await trx.commit(); // Commit transaction
      res.json({ success: true, data: result });
    } catch (transactionError) {
      await trx.rollback(); // Rollback on error
      throw transactionError;
    }

  } catch (error) {
    console.error('Manual resolution error:', error);
    res.status(400).json({ error: error.message });
  }
}

// Admin endpoint to suspend or unsuspend an event
async function handleSuspendEvent(req, res) {
  try {
    const eventId = req.params.id;
    const { is_suspended } = req.body;

    // Validate input
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    if (typeof is_suspended !== 'boolean') {
      return res.status(400).json({ error: 'is_suspended must be a boolean value' });
    }

    const result = await suspendEvent(req.db, eventId, is_suspended);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Error updating event suspension status:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: 'Failed to update event suspension status' });
  }
}

// Admin endpoint to delete an event and its associated participants
async function handleDeleteEvent(req, res) {
  const eventId = req.params.id;

  // Validate input
  if (!eventId || isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const result = await deleteEvent(req.db, eventId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting event:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: 'Failed to delete event' });
  }
}

// Admin endpoint to transfer platform fees to a user
async function handleTransferPlatformFees(req, res) {
  const { userId, amount, reason } = req.body;
  
  // Validate input
  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  
  try {
    const result = await transferPlatformFees(req.db, userId, amount, reason, req.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error transferring platform fees:', error);
    if (error.message.includes('Insufficient platform fees')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to transfer platform fees' });
  }
}

/**
 * @api {get} /api/admin/metrics Get platform metrics
 * @apiName GetMetrics
 * @apiGroup Admin
 * @apiHeader {String} Authorization Admin access token
 *
 * @apiSuccess {Number} totalEvents Total number of events
 * @apiSuccess {Number} activeEvents Number of active events (unresolved)
 * @apiSuccess {Number} completedEvents Number of completed events
 * @apiSuccess {Number} totalFees Total platform fees collected
 */
async function handleGetMetrics(req, res) {
  try {
    const metrics = await getMetrics(req.db);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}

module.exports = {
  adminCreateEvent,
  getEventStatus, // No conflict, not renamed
  handleGetTotalPlatformFees,
  handleGetEvents,
  handleGetEventParticipants,
  handleGetEventTemplates,
  handleGetUsers,
  handleGetUserDetails,
  handleAdjustUserPoints,
  handleUpdateUserRole,
  handleSuspendUser,
  handleResetUserClaims,
  handleManualResolveEvent,
  handleSuspendEvent,
  handleDeleteEvent,
  handleTransferPlatformFees,
  handleGetMetrics
};