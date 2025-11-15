// services/eventService.js - Event business logic functions extracted from server.js

const { getCurrentPrice, getHistoricalPrice } = require('./coingeckoService');
const { updateUserPoints } = require('../utils/pointsUtils');
const { broadcastEventResolution } = require('../websocket/websocketServer');

// --- Event Creation Functions ---
async function createEvent(db, initialPrice) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const entryFee = 100;
  console.log('Creating event with entry fee:', entryFee, 'and initial price:', initialPrice);

  // Generate formatted title with closing price question and creation price
  const eventDate = new Date().toISOString().split('T')[0];
  const title = `Closing price of Bitcoin on ${eventDate}`;
  
  // Create simplified Higher/Lower options
  const options = [
    { id: 'higher', label: 'Higher', value: 'Higher' },
    { id: 'lower', label: 'Lower', value: 'Lower' }
  ];
  
  // Look up event type 'prediction'
  const typeQueryResult = await db.raw(`SELECT id FROM event_types WHERE name = 'prediction'`);
  const eventTypes = typeQueryResult.rows || typeQueryResult; // Handle both PG and SQLite raw query results

  if (eventTypes.length === 0) {
    throw new Error("Event type 'prediction' not found");
  }
  const eventTypeId = eventTypes[0].id;

  await db.raw(
    `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time, location, event_type_id, status, resolution_status, entry_fee, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'pending', ?, ?)`,
    [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime, 'Global', eventTypeId, entryFee, JSON.stringify(options)]
  );
}

// --- Event Resolution Job ---
async function resolvePendingEvents(db) {
  try {
    console.log('🔍 Resolving pending events...');
    const now = new Date();
    console.log(`🔍 Resolution timestamp: ${now.toISOString()}`);
    
    // Find events ready for resolution
    const { rows: events } = await db.raw(
      `SELECT id, end_time, initial_price FROM events
       WHERE end_time < ? AND resolution_status = 'pending'`,
      [now]
    );

    if (events.length === 0) {
      console.log('🔍 No pending events to resolve');
      return;
    }

    console.log(`🔍 Found ${events.length} events to resolve`);
    console.log(`🔍 Events to resolve: ${events.map(e => e.id).join(', ')}`);
    
    for (const event of events) {
      try {
        console.log(`🔍 Resolving event ${event.id}...`);
        console.log(`🔍 Event ${event.id} initial price: $${event.initial_price}`);
        console.log(`🔍 Event ${event.id} end time: ${event.end_time}`);
        
        const finalPrice = await getHistoricalPrice(process.env.CRYPTO_ID || 'bitcoin', event.end_time);
        console.log(`🔍 Event ${event.id} final price from CoinGecko: $${finalPrice}`);
        
        // Update event with final price
        await db.raw(
          `UPDATE events
           SET final_price = ?, resolution_status = 'resolved'
           WHERE id = ?`,
          [finalPrice, event.id]
        );
        
        console.log(`🔍 Resolved event ${event.id} with final price: $${finalPrice}`);
        
        // Determine outcome based on Higher/Lower
        let correctAnswer;
        const initialPrice = parseFloat(event.initial_price.toFixed(2));
        const finalPriceRounded = parseFloat(finalPrice.toFixed(2));

        if (finalPriceRounded > initialPrice) {
          correctAnswer = 'Higher';
        } else if (finalPriceRounded < initialPrice) {
          correctAnswer = 'Lower';
        } else {
          // Edge case: If prices are exactly equal after rounding, we must have a winner.
          // Per your instruction, we'll arbitrarily pick one. Let's make it 'Higher' for consistency.
          // This can be changed to 'Lower' if preferred, or a refund logic could be implemented here in the future.
          correctAnswer = 'Higher';
        }
        console.log(`🔍 Event ${event.id} correct answer: ${correctAnswer}`);
        
        // Update event with correct answer
        await db.raw(
          `UPDATE events
           SET correct_answer = ?
           WHERE id = ?`,
          [correctAnswer, event.id]
        );
        
        // Calculate total pot from all participants
        console.log(`🔍 Calculating total pot for event ${event.id}...`);
        const { rows: [potData] } = await db.raw(
          `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = ?`,
          [event.id]
        );
        console.log(`🔍 Event ${event.id} total pot: ${potData.total_pot}`);
        
        // Calculate platform fee (5%) and remaining pot
        const platformFee = Math.floor(potData.total_pot * 0.05);
        const remainingPot = potData.total_pot - platformFee;
        console.log(`🔍 Event ${event.id} platform fee (5%): ${platformFee}`);
        console.log(`🔍 Event ${event.id} remaining pot after fee: ${remainingPot}`);
        
        // Update event with platform fee
        console.log(`🔍 Updating event ${event.id} with platform fee...`);
        await db.raw(
          'UPDATE events SET platform_fee = platform_fee + ? WHERE id = ?',
          [platformFee, event.id]
        );
        console.log(`🔍 Event ${event.id} platform fee updated successfully`);
        
        if (potData.total_pot > 0) {
          // Get all winners with their bet amounts and participant IDs
          const { rows: winners } = await db.raw(
            `SELECT id, user_id, amount FROM participants WHERE event_id = ? AND prediction = ?`,
            [event.id, correctAnswer]
          );
          
          if (winners.length > 0) {
            // Calculate total amount bet by winners
            console.log(`🔍 Event ${event.id} calculating total amount bet by winners...`);
            const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);
            console.log(`🔍 Event ${event.id} total amount bet by winners: ${totalWinnerAmount}`);
            
            // Award proportional share of pot to each winner
            // Record winner outcomes and distribute points
            for (const winner of winners) {
              console.log(`🔍 Calculating share for winner ${winner.user_id} (participant ${winner.id})...`);
              console.log(`🔍 Winner ${winner.user_id} bet amount: ${winner.amount}`);
              const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * remainingPot);
              console.log(`🔍 Winner ${winner.user_id} share: ${winnerShare}`);
              
              // Record fee contribution for this participant
              const winnerFee = Math.floor(winner.amount * 0.05);
              console.log(`🔍 Recording platform fee for winner ${winner.user_id}: ${winnerFee}`);
              await db.raw(
                'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES (?, ?, ?)',
                [event.id, winner.id, winnerFee]
              );
              
              
              // Use a transaction for each winner to ensure consistency
              const trx = await db.transaction();
              try {
                console.log(`🔍 Distributing points to winner ${winner.user_id}...`);
                
                // Update user points using centralized function
                console.log(`🔍 Adding ${winnerShare} points to user ${winner.user_id}`);
                const newBalance = await updateUserPoints(trx, winner.user_id, winnerShare, 'event_win', event.id);
                
                // Record winning outcome
                console.log(`🔍 Recording winning outcome for participant ${winner.id}`);
                await trx.raw(
                  `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                   VALUES (?, 'win', ?)`,
                  [winner.id, winnerShare]
                );
                
                // Add diagnostic logging
                console.log(`🔍 Inserted event_outcome for winner: participant_id=${winner.id}, result=win, points_awarded=${winnerShare}`);
                
                await trx.commit();
                console.log(`🔍 Transaction committed for winner ${winner.user_id}`);
              } catch (error) {
                await trx.rollback();
                console.log(`❌ Transaction rolled back for winner ${winner.user_id} due to error:`, error);
                // Continue with other winners even if one fails
                continue;
              }
            }

            // Record losing outcomes
            console.log(`🔍 Identifying losers for event ${event.id}`);
            const losers = await db.raw(
              `SELECT p.id, p.user_id FROM participants p
               WHERE p.event_id = ? AND p.prediction != ?`,
              [event.id, correctAnswer]
            );
            console.log(`🔍 Event ${event.id} losers found: ${losers.rows.length}`);
            
            for (const loser of losers.rows) {
              console.log(`🔍 Recording losing outcome for participant ${loser.id} (user ${loser.user_id})`);
              await db.raw(
                `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                 VALUES (?, 'loss', 0)`,
                [loser.id]
              );
              
              // Add diagnostic logging
              console.log(`🔍 Inserted event_outcome for loser: participant_id=${loser.id}, result=loss, points_awarded=0`);
            }

            // Get all participants for the audit log
            console.log(`🔍 Getting all participants for audit log of event ${event.id}`);
            const { rows: participants } = await db.raw(
              'SELECT * FROM participants WHERE event_id = ?',
              [event.id]
            );
            console.log(`🔍 Event ${event.id} total participants: ${participants.length}`);
            
            // Add audit log entry
            console.log(`🔍 Adding audit log entry for event ${event.id}`);
            await db.raw(
              `INSERT INTO audit_logs (event_id, action, details)
               VALUES (?, 'event_resolution', ?)`,
              [event.id, JSON.stringify({
                 totalParticipants: participants.length,
                 totalWinners: winners.length,
                 totalPot: potData.total_pot,
                 platformFee: platformFee,
                 distributed: remainingPot,
                 feePerParticipant: winners.length > 0 ? Math.floor(winners[0].amount * 0.05) : 0,
                 resolvedAt: new Date().toISOString()
               })]
            );
            console.log(`🔍 Audit log entry added for event ${event.id}`);
            
            console.log(`✅ Distributed ${potData.total_pot} points to ${winners.length} winners for event ${event.id}`);
            
            // Broadcast resolution to all connected clients
            broadcastEventResolution(event.id, {
              correctAnswer,
              finalPrice,
              status: 'resolved'
            });
          } else {
            console.log(`🔍 No winners for event ${event.id}, pot not distributed`);
          }
        } else {
          console.log(`🔍 Event ${event.id} has no pot to distribute`);
        }
      } catch (error) {
        // --- START OF NEW, MORE DETAILED LOGGING ---
        if (error.response) {
            // This means the CoinGecko server responded with an error (like 429)
            console.error(`❌ Failed to resolve event ${event.id}. API Error: Status ${error.response.status} - ${error.response.statusText}. Data:`, error.response.data);
            // We'll skip this event for now and let the cron job try again later.
        } else {
            // This is for other errors, like a network failure
            console.error(`❌ Failed to resolve event ${event.id} with a non-API error:`, error.message);
        }
        // --- END OF NEW LOGGING ---
      }
    }
  } catch (error) {
    console.error('❌ Error in resolvePendingEvents:', error);
  }
}

// --- Initial Event Creation Function ---
async function createInitialEvent(db) {
  try {
    const query = db.client.config.client === 'pg'
      ? "SELECT 1 FROM events WHERE start_time > NOW() - INTERVAL '1 day' LIMIT 1"
      : "SELECT 1 FROM events WHERE start_time > datetime('now', '-1 day') LIMIT 1";
    const existing = await db.raw(query);
    const existingEvents = existing.rows || existing; // Handle both PG and SQLite raw query results
    if (existingEvents.length === 0) {
      const price = await getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
      console.log('Initial event creation triggered with price:', price);
      await createEvent(db, price);
    }
  } catch (error) {
    console.error('Initial event creation failed:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    try {
      console.log('Attempting fallback event creation with default price...');
      await createEvent(db, 50000); // Default price
      console.log("Created fallback Bitcoin event with default price: $50000");
    } catch (fallbackError) {
      console.error('Fallback event creation also failed:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// --- Daily Event Creation Function ---
async function createDailyEvent(db) {
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const currentPrice = await getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Daily event creation triggered with price:', currentPrice);
    await createEvent(db, currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try fallback with default price
    try {
      console.log('Attempting fallback event creation with default price...');
      await createEvent(db, 50000); // Default price
      console.log("Created fallback Bitcoin event with default price: $50000");
    } catch (fallbackError) {
      console.error('Fallback event creation also failed:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Manual event resolution function
async function manualResolveEvent(db, trx, eventId, correctAnswer, finalPrice = null) {
  try {
    // Get event details
    const eventQuery = await trx.raw(
      'SELECT * FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );
    
    if (eventQuery.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventQuery.rows[0];
    
    // Validate event can be resolved
    if (event.resolution_status === 'resolved') {
      throw new Error('Event already resolved');
    }

    // Update event with manual resolution
    const updateQuery = finalPrice
      ? `UPDATE events SET correct_answer = ?, final_price = ?, resolution_status = 'resolved' WHERE id = ? RETURNING *`
      : `UPDATE events SET correct_answer = ?, resolution_status = 'resolved' WHERE id = ? RETURNING *`;
    
    const updateParams = finalPrice
      ? [correctAnswer, finalPrice, eventId]
      : [correctAnswer, eventId];
    
    const { rows: [updatedEvent] } = await trx.raw(updateQuery, updateParams);

    // Calculate total pot from participants
    const { rows: [potData] } = await trx.raw(
      `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = ?`,
      [eventId]
    );

    const totalPot = potData.total_pot || 0;
    
    if (totalPot > 0) {
      // Calculate platform fee (5%) and remaining pot
      const platformFee = Math.floor(totalPot * 0.05);
      const remainingPot = totalPot - platformFee;

      // Update event with platform fee
      await trx.raw(
        'UPDATE events SET platform_fee = platform_fee + ? WHERE id = ?',
        [platformFee, eventId]
      );

      // Get all winners with their bet amounts
      const { rows: winners } = await trx.raw(
        `SELECT id, user_id, amount FROM participants WHERE event_id = ? AND prediction = ?`,
        [eventId, correctAnswer]
      );

      if (winners.length > 0) {
        // Calculate total amount bet by winners
        const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);

        // Award proportional share of pot to each winner
        for (const winner of winners) {
          const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * remainingPot);
          const winnerFee = Math.floor(winner.amount * 0.05);

          // Record fee contribution
          await trx.raw(
            'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES (?, ?, ?)',
            [eventId, winner.id, winnerFee]
          );

          // Update user points using centralized function and record outcome
          const newBalance = await updateUserPoints(trx, winner.user_id, winnerShare, 'event_win', eventId);

          await trx.raw(
            `INSERT INTO event_outcomes (participant_id, result, points_awarded)
             VALUES (?, 'win', ?)`,
            [winner.id, winnerShare]
          );
        }

        // Record losing outcomes
        const { rows: losers } = await trx.raw(
          `SELECT p.id, p.user_id FROM participants p
           WHERE p.event_id = ? AND p.prediction != ?`,
          [eventId, correctAnswer]
        );

        for (const loser of losers) {
          await trx.raw(
            `INSERT INTO event_outcomes (participant_id, result, points_awarded)
             VALUES (?, 'loss', 0)`,
            [loser.id]
          );
        }

        // Add audit log entry
        await trx.raw(
          `INSERT INTO audit_logs (event_id, action, details)
           VALUES (?, 'manual_event_resolution', ?)`,
          [eventId, JSON.stringify({
            totalParticipants: winners.length + losers.length,
            totalWinners: winners.length,
            totalPot: totalPot,
            platformFee: platformFee,
            distributed: remainingPot,
            resolvedBy: 'admin',
            resolvedAt: new Date().toISOString(),
            correctAnswer: correctAnswer,
            finalPrice: finalPrice
          })]
        );
      }
    }

    // Broadcast resolution to all connected clients
    broadcastEventResolution(eventId, {
      correctAnswer,
      finalPrice,
      status: 'resolved'
    });

    return updatedEvent;

  } catch (error) {
    throw error;
  }
}


// Placeholder for new service functions
async function checkExistingEventByTitle(db, title) {
  console.warn('Placeholder: checkExistingEventByTitle not implemented.');
  // Implement logic to check if an event with the given title already exists
  // Example: const { rows } = await db.raw('SELECT id FROM events WHERE title = ?', [title]);
  // return rows.length > 0;
  return false; 
}

async function getEventTypeByName(db, name) {
  console.warn('Placeholder: getEventTypeByName not implemented.');
  // Implement logic to retrieve event type by name
  // Example: const { rows } = await db.raw('SELECT id FROM event_types WHERE name = ?', [name]);
  // return rows[0];
  return null;
}

async function createEventWithDetails(db, eventDetails) {
  console.warn('Placeholder: createEventWithDetails not implemented.');
  // Implement logic to create an event with detailed information
  // Example: await db.raw('INSERT INTO events (...) VALUES (...)', [...]);
  return { id: 'placeholder-event-id', ...eventDetails };
}

async function checkEventExists(db, eventId) {
  console.warn('Placeholder: checkEventExists not implemented.');
  // Implement logic to check if an event exists
  // Example: const { rows } = await db.raw('SELECT id FROM events WHERE id = ?', [eventId]);
  // return rows.length > 0;
  return false;
}

async function getEventDetails(db, eventId) {
  console.warn('Placeholder: getEventDetails not implemented.');
  // Implement logic to get full event details
  // Example: const { rows } = await db.raw('SELECT * FROM events WHERE id = ?', [eventId]);
  // return rows[0];
  return null;
}

async function checkEventStatus(db, eventId) {
  console.warn('Placeholder: checkEventStatus not implemented.');
  // Implement logic to get event status
  // Example: const { rows } = await db.raw('SELECT status FROM events WHERE id = ?', [eventId]);
  // return rows[0]?.status;
  return 'unknown';
}

async function checkExistingParticipation(db, userId, eventId) {
  console.warn('Placeholder: checkExistingParticipation not implemented.');
  // Implement logic to check if a user has already participated in an event
  // Example: const { rows } = await db.raw('SELECT id FROM participants WHERE user_id = ? AND event_id = ?', [userId, eventId]);
  // return rows.length > 0;
  return false;
}

async function getUserBalance(db, userId) {
  console.warn('Placeholder: getUserBalance not implemented.');
  // Implement logic to get user's current balance
  // Example: const { rows } = await db.raw('SELECT points FROM users WHERE id = ?', [userId]);
  // return rows[0]?.points;
  return 0;
}

async function insertParticipant(db, participantDetails) {
  console.warn('Placeholder: insertParticipant not implemented.');
  // Implement logic to insert a new participant
  // Example: await db.raw('INSERT INTO participants (...) VALUES (...)', [...]);
  return { id: 'placeholder-participant-id', ...participantDetails };
}

async function updateEventStats(db, eventId) {
  console.warn('Placeholder: updateEventStats not implemented.');
  // Implement logic to update event statistics (e.g., total participants, pot size)
  // This might involve recalculating and updating fields in the events table
  return true;
}

async function getActiveEvents(db) {
  console.warn('Placeholder: getActiveEvents not implemented.');
  // Implement logic to retrieve all active events
  // Example: const { rows } = await db.raw('SELECT * FROM events WHERE status = ?', ['active']);
  // return rows;
  return [];
}

async function getParticipationHistory(db, userId) {
  console.warn('Placeholder: getParticipationHistory not implemented.');
  // Implement logic to retrieve a user's participation history
  // Example: const { rows } = await db.raw('SELECT * FROM participants WHERE user_id = ?', [userId]);
  // return rows;
  return [];
}

async function getEventPrizePool(db, eventId) {
  console.warn('Placeholder: getEventPrizePool not implemented.');
  // Implement logic to get the total prize pool for an event
  // Example: const { rows } = await db.raw('SELECT SUM(amount) as total_pot FROM participants WHERE event_id = ?', [eventId]);
  // return rows[0]?.total_pot || 0;
  return 0;
}

async function getUserPrediction(db, userId, eventId) {
  console.warn('Placeholder: getUserPrediction not implemented.');
  // Implement logic to get a user's prediction for a specific event
  // Example: const { rows } = await db.raw('SELECT prediction FROM participants WHERE user_id = ? AND event_id = ?', [userId, eventId]);
  // return rows[0]?.prediction;
  return null;
}

async function getOptionVolumes(db, eventId) {
  console.warn('Placeholder: getOptionVolumes not implemented.');
  // Implement logic to get the volume of bets for each option in an event
  // Example: const { rows } = await db.raw('SELECT prediction, SUM(amount) as volume FROM participants WHERE event_id = ? GROUP BY prediction', [eventId]);
  // return rows;
  return [];
}

async function getParticipantCount(db, eventId) {
  console.warn('Placeholder: getParticipantCount not implemented.');
  // Implement logic to get the number of participants for an event
  // Example: const { rows } = await db.raw('SELECT COUNT(DISTINCT user_id) as count FROM participants WHERE event_id = ?', [eventId]);
  // return rows[0]?.count || 0;
  return 0;
}

async function getCurrentCryptoPrice(cryptoSymbol) {
  console.warn('Placeholder: getCurrentCryptoPrice not implemented.');
  // Implement logic to get the current price of a cryptocurrency
  // Example: return await getCurrentPrice(cryptoSymbol);
  return 0;
}

async function calculatePriceRanges(initialPrice) {
  console.warn('Placeholder: calculatePriceRanges not implemented.');
  // Implement logic to calculate price ranges for prediction options
  // Example: return { lower: initialPrice * 0.9, higher: initialPrice * 1.1 };
  return { lower: 0, higher: 0 };
}

module.exports = {
  createEvent,
  resolvePendingEvents,
  createInitialEvent,
  createDailyEvent,
  manualResolveEvent,
  broadcastEventResolution,
  // New service functions
  checkExistingEventByTitle,
  getEventTypeByName,
  createEventWithDetails,
  checkEventExists,
  getEventDetails,
  checkEventStatus,
  checkExistingParticipation,
  getUserBalance,
  insertParticipant,
  updateEventStats,
  getActiveEvents,
  getParticipationHistory,
  getEventPrizePool,
  getUserPrediction,
  getOptionVolumes,
  getParticipantCount,
  getCurrentCryptoPrice,
  calculatePriceRanges
};