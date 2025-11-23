// eventController.js - Event route handlers extracted from eventRoutes.js

const { updateUserPoints } = require('../utils/pointsUtils');
const {
  resolvePendingEvents,
  checkExistingEventByTitle,
  getEventTypeByName,
  createEventWithDetails,
  getCurrentCryptoPrice,
  calculatePriceRanges,
  checkEventStatus,
  checkExistingParticipation,
  getUserBalance,
  insertParticipant,
  updateEventStats,
  getActiveEvents,
  getParticipationHistory,
  getEventDetails,
  getEventPrizePool,
  getUserPrediction,
  getOptionVolumes,
  getParticipantCount
} = require('../services/eventService');
const { broadcastParticipation } = require('../websocket/websocketServer');

// Event creation controller function
async function createEvent(db, req, res) {
    const { title, description, entry_fee, start_time, end_time, location, capacity } = req.body;
    if (!title || !description || entry_fee === undefined) {
        return res.status(400).json({ error: 'Required fields: title, description, entry_fee' });
    }
    // Use current time if start_time not provided
    const startTime = start_time ? new Date(start_time) : new Date();
    // Default to 24 hours from start if end_time not provided
    const endTime = end_time ? new Date(end_time) : new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    
    // Validate that end time is after start time
    if (endTime <= startTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    try {
        // Check for existing event with same title
        const existingEvent = await checkExistingEventByTitle(db, title);
        if (existingEvent.length > 0) {
            return res.status(409).json({ error: 'Event title already exists' });
        }

        // Look up event type 'prediction'
        const eventType = await getEventTypeByName(db, 'prediction');
        if (eventType.length === 0) {
            return res.status(400).json({ error: "Event type 'prediction' not found" });
        }
        const eventTypeId = eventType[0].id;

        // Get current price for the cryptocurrency
        const currentPrice = await getCurrentCryptoPrice(process.env.CRYPTO_ID || 'bitcoin');
        
        // Create price range options
        const priceRanges = calculatePriceRanges(currentPrice);
        const options = [
          { id: 'range_0_3_up', label: '0-3% up', value: '0-3% up' },
          { id: 'range_3_5_up', label: '3-5% up', value: '3-5% up' },
          { id: 'range_5_up', label: '>5% up', value: '>5% up' },
          { id: 'range_0_3_down', label: '0-3% down', value: '0-3% down' },
          { id: 'range_3_5_down', label: '3-5% down', value: '3-5% down' },
          { id: 'range_5_down', label: '>5% down', value: '>5% down' }
        ];

        // Pre-flight table check with database-specific queries
        let tableExists;
        if (db.client.config.client === 'pg') {
          tableExists = await db.raw(
            "SELECT 1 FROM information_schema.tables WHERE table_name='events'"
          );
        } else {
          // SQLite check
          tableExists = await db.raw(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
          );
        }
        
        if (!tableExists.rows.length) {
          console.error('❌ Events table does not exist');
          return res.status(500).json({ error: 'Database schema issue' });
        }

        // Debug: Log parameters before INSERT
        console.debug(`Inserting into events table:`, {
          title,
          description,
          options: JSON.stringify(options),
          entry_fee,
          startTime,
          endTime,
          location,
          capacity,
          eventTypeId,
          currentPrice
        });

        try {
          // Create new event with all parameters using service function
          const newEvent = await createEventWithDetails(db, {
            title,
            description,
            options,
            entry_fee,
            startTime,
            endTime,
            location,
            capacity,
            eventTypeId,
            crypto_symbol: process.env.DEFAULT_CRYPTO_SYMBOL || 'btc',
            initial_price: currentPrice
          });
          console.debug('Event creation successful', newEvent);
          res.status(201).json(newEvent);
          // broadcastParticipation(newEvent.id); // This will be handled in server.js
        } catch (error) {
          console.error(`Event creation failed: ${error.message}`, {
            errorDetails: error
          });
          res.status(500).json({ error: 'Event creation failed' });
        }
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Event title already exists' });
        }
        console.error('❌ Event creation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

// Event participation controller function
async function participateInEvent(db, req, res) {
  const eventId = req.params.id;
  const userId = req.userId;
  const { prediction, entryFee } = req.body;

  // Validate prediction - updated to use price range options
  const validPredictions = [
      '0-3% up', '3-5% up', '5%+ up',
      '0-3% down', '3-5% down', '5%+ down'
  ];
  
  if (!validPredictions.includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction value' });
  }

  if (entryFee < 100 || entryFee > 1000 || entryFee % 25 !== 0) {
    return res.status(400).json({ error: 'Entry fee must be between 100-1000 and divisible by 25' });
  }

  const trx = await db.transaction();
  try {
    // Verify event is active
    const event = await checkEventStatus(trx, eventId);
    
    if (event.status !== 'active' || new Date(event.end_time) < new Date()) {
      throw new Error('EVENT_CLOSED');
    }

    // Check existing participation
    const existing = await checkExistingParticipation(trx, eventId, userId);
    
    if (existing.length > 0) {
      throw new Error('DUPLICATE_ENTRY');
    }

    // Validate and deduct entry fee using centralized function
    const userBalance = await getUserBalance(trx, userId);
    
    if (userBalance < entryFee) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Use centralized function to deduct points and log transaction
    const newBalance = await updateUserPoints(trx, userId, -entryFee, 'event_entry', eventId);
    
    // Record participation
    await insertParticipant(trx, {
      eventId,
      userId,
      prediction,
      amount: entryFee
    });

    await trx.commit();
    res.json({ success: true, newBalance });
  } catch (error) {
    await trx.rollback();
    handleParticipationError(error, res);
  } finally {
    // No need to release client with Knex transactions
  }
}

function handleParticipationError(error, res) {
  switch(error.message) {
    case 'EVENT_CLOSED':
      res.status(410).json({ error: 'Event closed for predictions' });
      break;
    case 'DUPLICATE_ENTRY':
      res.status(409).json({ error: 'Already participated in this event' });
      break;
    case 'INSUFFICIENT_FUNDS':
      res.status(402).json({ error: 'Insufficient balance for entry fee' });
      break;
    case 'INVALID_PREDICTION':
      res.status(400).json({ error: 'Invalid prediction value' });
      break;
    default:
      console.error('Participation error:', error);
      res.status(500).json({ error: 'Participation failed' });
  }
}

// Event betting controller function - REFACTORED FOR ACID COMPLIANCE
async function betOnEvent(db, req, res) {
  const eventId = req.params.id;
  const { prediction, entryFee } = req.body;
  const userId = req.userId;
  
  console.log('DEBUG: Bet placement request received', { eventId, userId, prediction });
  
  let trx;
  try {
      console.log('DEBUG: Starting transaction');
      trx = await db.transaction();
      console.log('DEBUG: Transaction started');

      // Get event details with FOR UPDATE to lock the row and prevent race conditions
      console.log('DEBUG: Getting event details with lock', { eventId });
      const eventQuery = await trx.raw(`
        SELECT * FROM events 
        WHERE id = ? 
        FOR UPDATE
      `, [eventId]);
      
      const eventData = eventQuery.rows?.[0] || eventQuery?.[0];
      if (!eventData) {
          console.log('DEBUG: Event not found', { eventId });
          await trx.rollback();
          return res.status(404).json({ error: 'Event not found' });
      }
      
      // Validate event configuration
      console.log('Validating event entry fee - Value:', eventData.entry_fee, 'Type:', typeof eventData.entry_fee);
      if (typeof eventData.entry_fee !== 'number' || eventData.entry_fee < 100) {
          console.log('Invalid entry fee configuration detected:', eventData.entry_fee);
          await trx.rollback();
          return res.status(400).json({ error: 'Invalid event configuration' });
      }
      
      // Check event status and deadline
      const now = new Date();
      const endTime = new Date(eventData.end_time);
      if (eventData.status !== 'OPEN' || now >= endTime) {
          console.log('DEBUG: Event not open for betting or expired', {
              status: eventData.status,
              endTime,
              currentTime: now
          });
          await trx.rollback();
          return res.status(400).json({ error: 'Event is no longer open for betting' });
      }
      
      // Validate entry fee - use provided entryFee or default to event entry_fee
      const selectedEntryFee = entryFee || eventData.entry_fee;
      const validEntryFees = [100, 200, 500, 1000];
      
      if (!validEntryFees.includes(selectedEntryFee)) {
          await trx.rollback();
          return res.status(400).json({
              error: 'Invalid entry fee. Must be one of: ' + validEntryFees.join(', ')
          });
      }
      
      // Dynamically validate prediction against the event's actual options
      let validPredictions = [];
      const eventOptions = eventData.options;
      
      if (typeof eventOptions === 'string') {
          const parsedOptions = JSON.parse(eventOptions);
          if (typeof parsedOptions[0] === 'string') {
              validPredictions = parsedOptions;
          } else {
              validPredictions = parsedOptions.map(opt => opt.value);
          }
      } else if (Array.isArray(eventOptions)) {
          validPredictions = eventOptions.map(opt => opt.value);
      }

      if (!validPredictions.includes(prediction)) {
          console.log('DEBUG: Invalid prediction value received:', prediction);
          console.log('DEBUG: Valid predictions for this event:', validPredictions);
          await trx.rollback();
          return res.status(400).json({ error: 'Invalid prediction value submitted' });
      }
      
      // Check for existing participation
      console.log('DEBUG: Checking for existing participation', { eventId, userId });
      const existing = await checkExistingParticipation(trx, userId, eventId);
      if (existing) {
          console.log('DEBUG: User already participated in this event', { eventId, userId });
          await trx.rollback();
          throw new Error('DUPLICATE_ENTRY');
      }

      // Get user balance with FOR UPDATE to lock the row and prevent race conditions
      console.log('DEBUG: Getting user balance with lock', { userId });
      const userBalanceQuery = await trx.raw(`
        SELECT points FROM users 
        WHERE id = ? 
        FOR UPDATE
      `, [userId]);
      
      if (userBalanceQuery.rows?.length === 0 || userBalanceQuery?.length === 0) {
          console.log('DEBUG: User not found', { userId });
          await trx.rollback();
          return res.status(404).json({ error: 'User not found' });
      }
      
      const userBalance = userBalanceQuery.rows?.[0]?.points || userBalanceQuery?.[0]?.points;
      console.log('DEBUG: User points check', { 
          userId, 
          userPoints: userBalance, 
          entryFee: selectedEntryFee, 
          sufficient: userBalance >= selectedEntryFee 
      });
      
      if (userBalance < selectedEntryFee) {
          console.log('DEBUG: Insufficient points', { userId, userPoints: userBalance, entryFee: selectedEntryFee });
          await trx.rollback();
          throw new Error('INSUFFICIENT_FUNDS');
      }

      // Insert bet into participants table (atomic operation within transaction)
      console.log('DEBUG: Inserting bet into participants table', { eventId, userId, prediction, amount: selectedEntryFee });
      const newBet = await insertParticipant(trx, {
        eventId,
        userId,
        prediction,
        amount: selectedEntryFee
      });
      console.log('DEBUG: Bet inserted successfully', { newBet });

      // Deduct the bet amount from the user's points (atomic operation within transaction)
      console.log('DEBUG: Deducting bet amount from user points', { userId, amount: selectedEntryFee });
      await updateUserPoints(trx, userId, -selectedEntryFee, 'bet', eventId);
      console.log('DEBUG: Entry fee deducted successfully');
      
      // Update event stats (atomic operation within transaction)
      console.log('DEBUG: Updating event stats', { eventId });
      await updateEventStats(trx, eventId);
      console.log('DEBUG: Event stats updated successfully');
      
      await trx.commit();
      console.log('DEBUG: Transaction committed successfully', { newBet });
      res.status(201).json(newBet);
  } catch (error) {
      console.log('DEBUG: Error in bet placement, attempting rollback', { error });
      if (trx) {
          try {
              await trx.rollback();
              console.log('DEBUG: Transaction rolled back successfully');
          } catch (rollbackError) {
              console.error('Failed to rollback transaction:', rollbackError);
          }
      }
      
      // Use the existing error handling function for consistent error responses
      handleParticipationError(error, res);
  }
}

// Active events retrieval controller function
async function listActiveEvents(db, req, res) {
  try {
    // Log request details for debugging
    console.log('DEBUG: /api/events/active endpoint called');
    console.log('Request headers:', req.headers);
    console.log('Request query parameters:', req.query);
    
    // Validate query parameters if any
    // Add specific validation logic here if needed
    // For now, we just check for unexpected parameters
    const allowedParams = ['limit', 'offset']; // Add any parameters you want to allow
    const queryParams = Object.keys(req.query);
    const invalidParams = queryParams.filter(param => !allowedParams.includes(param));
    
    if (invalidParams.length > 0) {
      console.log('Invalid query parameters:', invalidParams);
      // We don't return an error for invalid parameters, just log them
    }
    
    const isPostgres = db.client.config.client === 'pg';
    
    // The actual database query should be handled by the service function
    // The controller should call the service function to get the raw data
    const rawEvents = await getActiveEvents(db); // Call the imported service function
    console.log('DEBUG: Query result rows count:', rawEvents.length);
    const now = new Date();

    // More robust data transformation with error handling
    const activeEvents = rawEvents.map(event => {
      try {
        // Handle null/undefined values gracefully
        const endTime = event.end_time ? new Date(event.end_time) : new Date();
        const startTime = event.start_time ? new Date(event.start_time) : new Date();
        
        // Add price range information for active events
        let priceRanges = null;
        if ((event.status === 'active' || event.resolution_status === 'pending') && event.initial_price) {
          try {
            priceRanges = calculatePriceRanges(event.initial_price);
          } catch (error) {
            console.error('Failed to calculate price ranges:', error);
          }
        }
        
        return {
          ...event,
          end_time: endTime.toISOString(),
          start_time: startTime.toISOString(),
          time_remaining: Math.floor((endTime - now) / 1000),
          status: endTime <= now ? 'expired' : (event.status || 'active'),
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null,
          price_ranges: priceRanges
        };
      } catch (transformError) {
        console.error('Error transforming event data:', transformError, event);
        // Return event with safe defaults
        return {
          ...event,
          end_time: event.end_time ? new Date(event.end_time).toISOString() : new Date().toISOString(),
          start_time: event.start_time ? new Date(event.start_time).toISOString() : new Date().toISOString(),
          time_remaining: 0,
          status: event.status || 'active',
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null,
          price_ranges: null
        };
      }
    });

    console.log('DEBUG: Returning active events count:', activeEvents.length);
    res.json(activeEvents);
  } catch (error) {
    console.error('Error in /api/events/active endpoint:', error);
    // Return 500 with error details for better debugging
    res.status(500).json({
      error: 'Failed to fetch active events',
      message: error.message
    });
  }
}

// Event participation history controller function
async function listParticipationHistory(db, req, res) {
  try {
    const { id } = req.params;

    // Fetch all participant entries for the event, ordered by creation time
    const participationHistory = await getParticipationHistory(db, id); // Call the imported service function
    res.json(participationHistory);
    
  } catch (error) {
    console.error('Error fetching participation history:', error);
    res.status(500).json({ error: 'Internal server error while fetching participation history' });
  }
}

// Event details retrieval controller function
async function fetchEventDetails(db, req, res) {
  try {
    const { id } = req.params;
    
    if (isNaN(id) || !Number.isInteger(parseFloat(id))) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }
    
    const eventId = parseInt(id);

    const event = await getEventDetails(db, eventId); // Call the imported service function

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.prize_pool = await getEventPrizePool(db, eventId) || 0;

    const userPrediction = await getUserPrediction(db, eventId, req.userId);
    event.user_prediction = userPrediction ? userPrediction.prediction : null;

    const optionVolumes = await getOptionVolumes(db, eventId);
    event.option_volumes = optionVolumes.reduce((acc, row) => {
      acc[row.prediction] = {
        total_amount: row.total_amount,
        multiplier: event.prize_pool > 0 && row.total_amount > 0 ? event.prize_pool / row.total_amount : 0
      };
      return acc;
    }, {});

    event.current_participants = await getParticipantCount(db, eventId);

    if (event.status === 'active' || event.resolution_status === 'pending') {
      try {
        const coinGeckoIdMap = {
          'btc': 'bitcoin',
          'eth': 'ethereum',
          'sol': 'solana',
          'ada': 'cardano'
        };
        const coinGeckoId = coinGeckoIdMap[event.crypto_symbol] || 'bitcoin';
        event.current_price = await getCurrentCryptoPrice(coinGeckoId);
        
        if (event.initial_price) {
          event.price_ranges = calculatePriceRanges(event.initial_price);
        }
      } catch (error) {
        console.error('Failed to fetch current price:', error);
        event.current_price = null;
      }
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Health status controller function
async function getHealthStatus(db, req, res) {
  try {
    res.json({ status: 'OK' });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
}

// Manual event resolution trigger controller function
async function triggerManualResolution(db, req, res) {
  try {
    await resolvePendingEvents(db, req.app.locals.clients, req.app.locals.WebSocket);
    res.json({ success: true, message: "Resolution job triggered" });
  } catch (error) {
    console.error('Error in manual event resolution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
    createEvent,
    participateInEvent,
    handleParticipationError,
    betOnEvent,
    listActiveEvents,
    listParticipationHistory,
    fetchEventDetails, // Export the renamed function
    getHealthStatus,
    triggerManualResolution
};