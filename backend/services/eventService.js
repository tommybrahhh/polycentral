// services/eventService.js - Event business logic functions extracted from server.js

const { getCurrentPrice, getHistoricalPrice } = require('./coingeckoService');
const {
  getNextRealMadridMatch,
  isMatchFinished,
  getOpponentName,
  getLeagueName,
  getRealMadridTeamId,
  getMatchResult,
  findNextUpcomingMatch
} = require('./apiFootballService');
const { updateUserPoints } = require('../utils/pointsUtils');
const { broadcastEventResolution } = require('../websocket/websocketServer');

// --- Event Creation Functions ---
async function createEvent(db, eventTypeName, title, initialPrice, options) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const entryFee = 100; // Assuming a default entry fee for now
  console.log(`[createEvent] Attempting to create event: type=${eventTypeName}, title=${title}, initialPrice=${initialPrice}, options=${JSON.stringify(options)}`);

  // Look up event type dynamically
  const typeQueryResult = await db.raw(`SELECT id FROM event_types WHERE name = ?`, [eventTypeName]);
  const eventTypes = typeQueryResult.rows || typeQueryResult; // Handle both PG and SQLite raw query results

  if (eventTypes.length === 0) {
    console.error(`[createEvent] Event type '${eventTypeName}' not found.`);
    throw new Error(`Event type '${eventTypeName}' not found`);
  }
  const eventTypeId = eventTypes[0].id;
  console.log(`[createEvent] Found event type ID: ${eventTypeId} for type: ${eventTypeName}`);

  try {
    await db.raw(
      `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time, location, event_type_id, status, resolution_status, entry_fee, options)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'pending', ?, ?)`,
      [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime, 'Global', eventTypeId, entryFee, JSON.stringify(options)]
    );
    console.log(`[createEvent] Successfully inserted event: ${title}`);
  } catch (dbError) {
    console.error(`[createEvent] Database insert failed for event ${title}:`, dbError);
    throw dbError;
  }
}

// --- Event Resolution Job ---
async function resolvePendingEvents(db) {
  try {
    console.log('🔍 Resolving pending events...');
    const now = new Date();
    console.log(`🔍 Resolution timestamp: ${now.toISOString()}`);
    
    // Find events ready for resolution with their event types
    const queryResult = await db.raw(
      `SELECT e.*, et.name as event_type_name
       FROM events e
       JOIN event_types et ON e.event_type_id = et.id
       WHERE e.end_time < ? AND e.resolution_status = 'pending'`,
      [now]
    );
    
    // Handle both PG (rows) and SQLite (array) raw query results
    const events = queryResult.rows || queryResult;

    if (!events || events.length === 0) {
      console.log('🔍 No pending events to resolve');
      return;
    }
    
    console.log(`🔍 Found ${events.length} events to resolve`);
    console.log(`🔍 Events to resolve: ${events.map(e => `${e.id} (${e.event_type_name})`).join(', ')}`);
    
    for (const event of events) {
      try {
        if (event.event_type_name === 'prediction') {
          // --- THIS IS YOUR EXISTING CRYPTO LOGIC ---
          console.log(`🔍 Resolving CRYPTO event ${event.id}...`);
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
                  
                  await trx.commit();
                  console.log(`🔍 Transaction committed for winner ${winner.user_id}`);
                } catch (error) {
                  await trx.rollback();
                  console.log(`❌ Transaction rolled back for winner ${winner.user_id} due to error:`, error);
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
              }

              // Add audit log entry
              console.log(`🔍 Adding audit log entry for event ${event.id}`);
              await db.raw(
                `INSERT INTO audit_logs (event_id, action, details)
                 VALUES (?, 'event_resolution', ?)`,
                [event.id, JSON.stringify({
                   totalParticipants: winners.length + losers.rows.length,
                   totalWinners: winners.length,
                   totalPot: potData.total_pot,
                   platformFee: platformFee,
                   distributed: remainingPot,
                   resolvedAt: new Date().toISOString()
                 })]
              );
              
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
          
        } else if (event.event_type_name === 'sport_match' || event.event_type_name === 'football') {
          // --- THIS IS THE NEW SPORT LOGIC ---
          console.log(`🔍 Resolving SPORT event ${event.id}...`);
          const result = await getMatchResult(event.external_id);
          
          if (!result || result.status !== 'finished') {
            console.log(`Match ${event.external_id} is not finished yet. Skipping.`);
            continue; // Skip this event, try again on the next cron run
          }
          
          const correctAnswer = result.winner; // 'home', 'away', or 'draw'
          
          // Update event with final result and status
          await db.raw(
            `UPDATE events
             SET final_price = NULL, resolution_status = 'resolved', correct_answer = ?
             WHERE id = ?`,
            [correctAnswer, event.id]
          );
          
          console.log(`✅ Resolved event ${event.id} with correct answer: ${correctAnswer}`);
          
          // --- Add your Winner Payout Logic ---
          // This part is identical to the crypto logic above
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
                  
                  await trx.commit();
                  console.log(`🔍 Transaction committed for winner ${winner.user_id}`);
                } catch (error) {
                  await trx.rollback();
                  console.log(`❌ Transaction rolled back for winner ${winner.user_id} due to error:`, error);
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
              }

              // Add audit log entry
              console.log(`🔍 Adding audit log entry for event ${event.id}`);
              await db.raw(
                `INSERT INTO audit_logs (event_id, action, details)
                 VALUES (?, 'event_resolution', ?)`,
                [event.id, JSON.stringify({
                   totalParticipants: winners.length + losers.rows.length,
                   totalWinners: winners.length,
                   totalPot: potData.total_pot,
                   platformFee: platformFee,
                   distributed: remainingPot,
                   resolvedAt: new Date().toISOString()
                 })]
              );
              
              console.log(`✅ Distributed ${potData.total_pot} points to ${winners.length} winners for event ${event.id}`);
              
              // Broadcast resolution to all connected clients
              broadcastEventResolution(event.id, {
                correctAnswer,
                finalPrice: null,
                status: 'resolved'
              });
            } else {
              console.log(`🔍 No winners for event ${event.id}, pot not distributed`);
            }
          } else {
            console.log(`🔍 Event ${event.id} has no pot to distribute`);
          }
        }
      } catch (error) {
        // --- START OF NEW, MORE DETAILED LOGGING ---
        if (error.response) {
            console.error(`❌ Failed to resolve event ${event.id}. API Error: Status ${error.response.status} - ${error.response.statusText}. Data:`, error.response.data);
        } else {
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
      const eventDate = new Date().toISOString().split('T')[0];
      const title = `Closing price of Bitcoin on ${eventDate}`;
      const options = [
        { id: 'higher', label: 'Higher', value: 'Higher' },
        { id: 'lower', label: 'Lower', value: 'Lower' }
      ];
      console.log('Initial event creation triggered with price:', price);
      await createEvent(db, 'prediction', title, price, options);
    }
  } catch (error) {
    console.error('Initial event creation failed:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    try {
      console.log('Attempting fallback event creation with default price...');
      const eventDate = new Date().toISOString().split('T')[0];
      const title = `Closing price of Bitcoin on ${eventDate}`;
      const options = [
        { id: 'higher', label: 'Higher', value: 'Higher' },
        { id: 'lower', label: 'Lower', value: 'Lower' }
      ];
      await createEvent(db, 'prediction', title, 50000, options); // Default price
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
  console.log('Attempting to create daily Bitcoin prediction event...');
  try {
    console.log('Fetching current price from CoinGecko...');
    const currentPrice = await getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    if (!currentPrice) {
      console.error('Failed to get current price from CoinGecko. Aborting daily event creation.');
      throw new Error('Could not retrieve current price.');
    }
    console.log('Daily event creation triggered with price:', currentPrice);
    const eventDate = new Date().toISOString().split('T')[0];
    const title = `Closing price of Bitcoin on ${eventDate}`;
    const options = [
      { id: 'higher', label: 'Higher', value: 'Higher' },
      { id: 'lower', label: 'Lower', value: 'Lower' }
    ];
    await createEvent(db, 'prediction', title, currentPrice, options);
    console.log("Successfully created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try fallback with default price
    try {
      console.log('Attempting fallback event creation with default price...');
      const eventDate = new Date().toISOString().split('T')[0];
      const title = `Closing price of Bitcoin on ${eventDate}`;
      const options = [
        { id: 'higher', label: 'Higher', value: 'Higher' },
        { id: 'lower', label: 'Lower', value: 'Lower' }
      ];
      await createEvent(db, 'prediction', title, 50000, options); // Default price
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
  try {
    const { rows } = await db.raw('SELECT id FROM events WHERE title = ?', [title]);
    return rows.length > 0;
  } catch (error) {
    console.error(`Error in checkExistingEventByTitle for title ${title}:`, error);
    return false; // Return false on error
  }
}

async function getEventTypeByName(db, name) {
  try {
    const { rows } = await db.raw('SELECT id FROM event_types WHERE name = ?', [name]);
    return rows; // Return the array of rows (should be 0 or 1)
  } catch (error) {
    console.error(`Error in getEventTypeByName for name ${name}:`, error);
    return []; // Return empty array on error
  }
}

async function createEventWithDetails(db, eventDetails) {
  try {
    const {
      title, description, options, entry_fee, startTime, endTime,
      location, capacity, eventTypeId, crypto_symbol, initial_price
    } = eventDetails;

    const { rows: [newEvent] } = await db.raw(
      `INSERT INTO events (
        title, description, options, entry_fee, start_time, end_time,
        location, max_participants, event_type_id, crypto_symbol, initial_price,
        status, resolution_status, external_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending', ?)
      RETURNING id, title, description, options, entry_fee, start_time, end_time,
                location, max_participants, event_type_id, crypto_symbol, initial_price,
                status, resolution_status, external_id`,
      [
        title, description, JSON.stringify(options), entry_fee, startTime, endTime,
        location, capacity, eventTypeId, crypto_symbol, initial_price, external_id
      ]
    );
    return newEvent;
  } catch (error) {
    console.error(`Error in createEventWithDetails for event ${eventDetails.title}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

async function checkEventExists(db, eventId) {
  try {
    const { rows } = await db.raw('SELECT id FROM events WHERE id = ?', [eventId]);
    return rows.length > 0;
  } catch (error) {
    console.error(`Error in checkEventExists for event ${eventId}:`, error);
    return false; // Return false on error
  }
}

async function getEventDetails(db, eventId) {
  try {
    const { rows } = await db.raw(
      `SELECT * FROM events
       WHERE id = ?`,
      [eventId]
    );
    
    if (rows.length === 0) {
      console.warn(`getEventDetails: Event with ID ${eventId} not found.`);
      return null;
    }

    return rows[0]; // Return the full event object
  } catch (error) {
    console.error(`Error in getEventDetails for event ${eventId}:`, error);
    return null; // Return null on error
  }
}

async function checkEventStatus(db, eventId) {
  try {
    const { rows } = await db.raw('SELECT status, end_time FROM events WHERE id = ?', [eventId]);
    if (rows.length === 0) {
      console.warn(`checkEventStatus: Event with ID ${eventId} not found.`);
      return null; // Or throw an error, depending on desired behavior
    }
    return rows[0]; // Returns { status: 'active', end_time: '...' }
  } catch (error) {
    console.error(`Error in checkEventStatus for event ${eventId}:`, error);
    return null; // Return null on error
  }
}

async function checkExistingParticipation(db, userId, eventId) {
  try {
    const { rows } = await db.raw(
      `SELECT id FROM participants 
       WHERE user_id = ? AND event_id = ?`,
      [userId, eventId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error(`Error in checkExistingParticipation for user ${userId} and event ${eventId}:`, error);
    return false; // Return false on error
  }
}

async function getUserBalance(db, userId) {
  try {
    const { rows } = await db.raw(
      `SELECT points FROM users 
       WHERE id = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      console.warn(`getUserBalance: User with ID ${userId} not found.`);
      return 0; // Return 0 if user not found
    }

    return rows[0].points; // Return their points balance
  } catch (error) {
    console.error(`Error in getUserBalance for user ${userId}:`, error);
    return 0; // Return 0 on error
  }
}

async function insertParticipant(db, participantDetails) {
  try {
    const { eventId, userId, prediction, amount } = participantDetails;
    const { rows: [newParticipant] } = await db.raw(
      `INSERT INTO participants (event_id, user_id, prediction, amount)
       VALUES (?, ?, ?, ?)
       RETURNING id, event_id, user_id, prediction, amount`,
      [eventId, userId, prediction, amount]
    );
    return newParticipant;
  } catch (error) {
    console.error(`Error in insertParticipant for event ${participantDetails.eventId} and user ${participantDetails.userId}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

async function updateEventStats(db, eventId) {
  try {
    // Recalculate current_participants and total_pot (prize_pool)
    const { rows: [stats] } = await db.raw(
      `SELECT 
         COUNT(DISTINCT user_id) as current_participants,
         COALESCE(SUM(amount), 0) as total_pot
       FROM participants 
       WHERE event_id = ?`,
      [eventId]
    );

    // Update the events table with the new statistics
    await db.raw(
      `UPDATE events
       SET current_participants = ?, prize_pool = ?
       WHERE id = ?`,
      [stats.current_participants, stats.total_pot, eventId]
    );
    return true;
  } catch (error) {
    console.error(`Error in updateEventStats for event ${eventId}:`, error);
    return false; // Return false on error
  }
}

async function getActiveEvents(db) {
  try {
    const { rows } = await db.raw(
      `SELECT * FROM events
       WHERE status = 'active'
       AND end_time > ?
       ORDER BY start_time DESC`,
      [new Date()]
    );
    return rows;
  } catch (error) {
    console.error('Error in getActiveEvents:', error);
    return []; // Return empty on error
  }
}

async function getParticipationHistory(db, userId) {
  try {
    const { rows } = await db.raw(
      `SELECT p.*, e.title, e.crypto_symbol, e.initial_price, e.final_price, e.correct_answer, e.end_time
       FROM participants p
       JOIN events e ON p.event_id = e.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error(`Error in getParticipationHistory for user ${userId}:`, error);
    return []; // Return empty array on error
  }
}

async function getEventPrizePool(db, eventId) {
  try {
    const { rows } = await db.raw(
      `SELECT COALESCE(SUM(amount), 0) as total_pot 
       FROM participants 
       WHERE event_id = ?`,
      [eventId]
    );
    return rows[0].total_pot;
  } catch (error) {
    console.error(`Error in getEventPrizePool for event ${eventId}:`, error);
    return 0; // Return 0 on error
  }
}

async function getUserPrediction(db, eventId, userId) {
  try {
    const { rows } = await db.raw(
      `SELECT prediction FROM participants 
       WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(`Error in getUserPrediction for user ${userId} and event ${eventId}:`, error);
    return null; // Return null on error
  }
}

async function getOptionVolumes(db, eventId) {
  try {
    const { rows } = await db.raw(
      `SELECT prediction, SUM(amount) as total_amount 
       FROM participants 
       WHERE event_id = ? 
       GROUP BY prediction`,
      [eventId]
    );
    return rows;
  } catch (error) {
    console.error(`Error in getOptionVolumes for event ${eventId}:`, error);
    return []; // Return empty array on error
  }
}

async function getParticipantCount(db, eventId) {
  try {
    const { rows } = await db.raw(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM participants 
       WHERE event_id = ?`,
      [eventId]
    );
    return rows[0].count;
  } catch (error) {
    console.error(`Error in getParticipantCount for event ${eventId}:`, error);
    return 0; // Return 0 on error
  }
}

async function getCurrentCryptoPrice(cryptoSymbol) {
  try {
    return await getCurrentPrice(cryptoSymbol);
  } catch (error) {
    console.error(`Error in getCurrentCryptoPrice for symbol ${cryptoSymbol}:`, error);
    return 0; // Return 0 on error
  }
}

async function calculatePriceRanges(initialPrice) {
  try {
    // Ensure the price is a number and non-zero
    const price = parseFloat(initialPrice);
    if (isNaN(price) || price <= 0) {
      console.error('Invalid initial price provided to calculatePriceRanges:', initialPrice);
      return { lower: 0, higher: 0 };
    }

    // Set a calculation percentage (e.g., 10% tolerance for the range)
    const percentage = 0.10; // This can be adjusted to 0.05 for 5%, etc.

    const lowerBound = price * (1 - percentage);
    const upperBound = price * (1 + percentage);

    return {
      lower: lowerBound,
      higher: upperBound
    };
  } catch (error) {
    console.error('Error in calculatePriceRanges:', error);
    return { lower: 0, higher: 0 }; // Return default on error
  }
}

async function createDailyTournament(db) {
  try {
    console.log('Creating daily Tournament event...');
    const currentPrice = await getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin'); // Still use current price for initial reference
    console.log('Daily tournament creation triggered with price:', currentPrice);

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days for a tournament
    const tournamentDate = new Date().toISOString().split('T')[0];
    const title = `Weekly Bitcoin Tournament - ${tournamentDate}`;
    const options = [
      { id: 'top_10_percent', label: 'Top 10% Price Increase', value: 'Top 10%' },
      { id: 'bottom_10_percent', label: 'Bottom 10% Price Decrease', value: 'Bottom 10%' },
      { id: 'stay_within_10_percent', label: 'Stay within 10% Range', value: 'Within 10%' }
    ]; // Example options for a tournament

    await createEvent(db, 'tournament', title, currentPrice, options);
    console.log("Created new Weekly Bitcoin Tournament with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily tournament:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try fallback with default price
    try {
      console.log('Attempting fallback tournament creation with default price...');
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days for a tournament
      const tournamentDate = new Date().toISOString().split('T')[0];
      const title = `Weekly Bitcoin Tournament - ${tournamentDate}`;
      const options = [
        { id: 'top_10_percent', label: 'Top 10% Price Increase', value: 'Top 10%' },
        { id: 'bottom_10_percent', label: 'Bottom 10% Price Decrease', value: 'Bottom 10%' },
        { id: 'stay_within_10_percent', label: 'Stay within 10% Range', value: 'Within 10%' }
      ];
      await createEvent(db, 'tournament', title, 50000, options); // Default price
      console.log("Created fallback Weekly Bitcoin Tournament with default price: $50000");
    } catch (fallbackError) {
      console.error('Fallback tournament creation also failed:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// --- Football Match Event Functions ---
async function createFootballMatchEvent(db, match) {
  try {
    const realMadridTeamId = await getRealMadridTeamId();
    const opponentName = getOpponentName(match, realMadridTeamId);
    const leagueName = getLeagueName(match);
    const matchTime = new Date(match.starting_at);
    
    const title = `Real Madrid vs ${opponentName} - ${leagueName}`;
    const description = `Football match prediction: Real Madrid vs ${opponentName} in ${leagueName}`;
    
    // Check if event already exists
    const existingEvent = await checkExistingEventByTitle(db, title);
    if (existingEvent) {
      console.log(`Football match event already exists: ${title}`);
      return null;
    }
    
    const options = [
      { id: 'real_madrid_win', label: 'Real Madrid Win', value: 'Real Madrid Win' },
      { id: 'opponent_win', label: `${opponentName} Win`, value: `${opponentName} Win` },
      { id: 'draw', label: 'Draw', value: 'Draw' }
    ];
    
    const eventDetails = {
      title,
      description,
      options: JSON.stringify(options),
      entry_fee: 100,
      startTime: new Date(),
      endTime: matchTime,
      location: `${match.venue?.name || 'Unknown Stadium'}, ${match.venue?.city || 'Unknown City'}`,
      capacity: 1000,
      eventTypeId: await getFootballEventTypeId(db),
      crypto_symbol: 'football',
      initial_price: 0, // Not used for football events
      external_id: match.id.toString() // Store the Sportmonks match ID
    };
    
    const newEvent = await createEventWithDetails(db, eventDetails);
    console.log(`✅ Created football match event: ${title}`);
    return newEvent;
  } catch (error) {
    console.error('Error creating football match event:', error);
    return null;
  }
}

async function getFootballEventTypeId(db) {
  try {
    const { rows } = await db.raw('SELECT id FROM event_types WHERE name = ?', ['sport_match']);
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // If sport_match doesn't exist, fall back to football (for backward compatibility)
    const { rows: footballRows } = await db.raw('SELECT id FROM event_types WHERE name = ?', ['football']);
    if (footballRows.length > 0) {
      return footballRows[0].id;
    }
    
    // Create sport_match event type if neither exists
    const { rows: [newType] } = await db.raw(
      'INSERT INTO event_types (name, description) VALUES (?, ?) RETURNING id',
      ['sport_match', 'Sports match predictions']
    );
    return newType.id;
  } catch (error) {
    console.error('Error getting football event type:', error);
    throw error;
  }
}

async function resolveFootballMatchEvents(db) {
  try {
    console.log('🔍 Resolving football match events...');
    
    // Find all active football events that should be resolved
    const { rows: footballEvents } = await db.raw(`
      SELECT e.*
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      WHERE et.name = 'football'
      AND e.resolution_status = 'pending'
      AND e.end_time < NOW()
    `);
    
    if (footballEvents.length === 0) {
      console.log('🔍 No football match events to resolve');
      return;
    }
    
    console.log(`🔍 Found ${footballEvents.length} football match events to resolve`);
    
    for (const event of footballEvents) {
      try {
        console.log(`🔍 Resolving football event ${event.id}: ${event.title}`);
        
        // Extract match ID from event metadata or try to parse from title
        // For now, we'll use a simple approach - this could be enhanced
        const matchResult = await determineFootballMatchResult(event);
        
        if (matchResult) {
          await manualResolveEvent(db, db, event.id, matchResult.correctAnswer);
          console.log(`✅ Resolved football event ${event.id} with result: ${matchResult.correctAnswer}`);
        } else {
          console.log(`⚠️ Could not determine result for football event ${event.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to resolve football event ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in resolveFootballMatchEvents:', error);
  }
}

async function determineFootballMatchResult(event) {
  try {
    if (!event.external_id) {
      console.error(`Event ${event.id} has no external_id, cannot determine result`);
      return null;
    }
    
    const matchId = event.external_id;
    console.log(`🔍 Checking Sportmonks for match result: ${matchId}`);
    
    const matchResult = await isMatchFinished(matchId);
    
    if (!matchResult.finished) {
      console.log(`Match ${matchId} is not finished yet`);
      return null;
    }
    
    // Extract opponent name from event title
    const titleParts = event.title.split(' vs ');
    const opponentName = titleParts.length > 1 ? titleParts[1].split(' - ')[0] : 'Opponent';
    
    let correctAnswer;
    if (matchResult.winner === 'home') {
      correctAnswer = 'Real Madrid Win';
    } else if (matchResult.winner === 'away') {
      correctAnswer = `${opponentName} Win`;
    } else if (matchResult.winner === 'draw') {
      correctAnswer = 'Draw';
    } else {
      console.error(`Unknown winner type: ${matchResult.winner}`);
      return null;
    }
    
    const finalScore = `${matchResult.homeScore}-${matchResult.awayScore}`;
    
    console.log(`✅ Determined match result: ${correctAnswer} (${finalScore})`);
    
    return {
      correctAnswer,
      finalScore,
      homeScore: matchResult.homeScore,
      awayScore: matchResult.awayScore
    };
  } catch (error) {
    console.error(`Error determining football match result for event ${event.id}:`, error);
    return null;
  }
}

async function createDailyFootballEvents(db) {
  try {
    console.log('⚽ Checking for upcoming Real Madrid matches...');
    const nextMatch = await getNextRealMadridMatch();
    
    if (!nextMatch) {
      console.log('⚽ No upcoming Real Madrid matches found');
      return;
    }
    
    console.log(`⚽ Found upcoming match: ${nextMatch.name}`);
    const event = await createFootballMatchEvent(db, nextMatch);
    
    if (event) {
      console.log(`✅ Created football prediction event for: ${event.title}`);
    }
  } catch (error) {
    console.error('Error creating daily football events:', error);
  }
}

async function createDailySportEvent(db) {
  console.log('Attempting to create daily sport event...');
  
  try {
    const match = await findNextUpcomingMatch();
    if (!match) {
      console.log('No upcoming sport match found to create an event for.');
      return;
    }
    
    const homeTeam = match.teams?.home?.name || 'Home Team';
    const awayTeam = match.teams?.away?.name || 'Away Team';
    const eventTitle = `Who will win: ${homeTeam} vs ${awayTeam}`;
    const external_id = match.fixture.id.toString();
    
    // Check if event for this match already exists
    const { rows: existing } = await db.raw('SELECT id FROM events WHERE external_id = ?', [external_id]);
    if (existing.length > 0) {
      console.log(`Event for match ${external_id} already exists. Skipping.`);
      return;
    }

    // Define the options for the bet
    const options = [
      { id: 'home', label: homeTeam, value: 'home' },
      { id: 'away', label: awayTeam, value: 'away' },
      { id: 'draw', label: 'Draw', value: 'draw' }
    ];
    
    const startTime = new Date();
    const endTime = new Date(match.fixture.date); // Event closes when the match starts
    
    // Use the main createEvent function, but pass the new details
    console.log(`Creating new sport event: ${eventTitle}`);
    await db.raw(
      `INSERT INTO events (title, start_time, end_time, event_type_id, status, resolution_status, entry_fee, options, external_id)
       VALUES (?, ?, ?, (SELECT id FROM event_types WHERE name = 'sport_match'), 'active', 'pending', 100, ?, ?)`,
      [eventTitle, startTime, endTime, JSON.stringify(options), external_id]
    );
    
    console.log(`Successfully created event for match: ${eventTitle}`);
    
  } catch (error) {
    console.error('Error creating daily sport event:', error.message);
  }
}

module.exports = {
  createEvent,
  resolvePendingEvents,
  createInitialEvent,
  createDailyEvent,
  createDailyTournament,
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
  calculatePriceRanges,
  // Football match functions
  createFootballMatchEvent,
  resolveFootballMatchEvents,
  createDailyFootballEvents,
  createDailySportEvent
};