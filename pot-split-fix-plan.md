# Pot Split Fix Plan

## Issue Analysis

After analyzing the code, I've identified several issues in the `resolvePendingEvents` function in `backend/server.js` that are preventing the pot split functionality from working correctly:

1. **Undefined variable `totalPot`**: On line 771, the code references `totalPot` but it should be `potData.total_pot`
2. **Undefined variable `client`**: On line 775, `client` is used but not defined in this scope
3. **Incorrect client usage**: On line 801, a new `client` is created but the previous one is not properly used
4. **Undefined variable `participants`**: On line 847, `participants` is used but not defined
5. **Missing variable declarations**: Several variables are used without proper declaration

## Backend Fixes Required

### 1. Fix resolvePendingEvents Function

The main issues are in the `resolvePendingEvents` function around lines 764-855. Here are the specific changes needed:

```javascript
// Line 771: Change from totalPot to potData.total_pot
const totalPot = potData.total_pot || 0;

// Line 775: Fix client reference - should use pool directly or properly initialized client
// Actually, we should use pool.query directly here since we're not in a transaction block

// Line 801: Move client initialization to proper location
const client = await pool.connect();

// Line 847: Define participants variable
const { rows: participants } = await pool.query(
  `SELECT p.id FROM participants p WHERE p.event_id = $1 AND p.prediction != $2`,
  [event.id, correctAnswer]
);
```

### 2. Complete Function Rewrite

The entire event resolution logic needs to be fixed for proper variable scoping and error handling:

```javascript
async function resolvePendingEvents() {
  try {
    console.log('Resolving pending events...');
    const now = new Date();
    
    // Find events ready for resolution
    const { rows: events } = await pool.query(
      `SELECT id, end_time, initial_price FROM events
       WHERE end_time < $1 AND resolution_status = 'pending'`,
      [now]
    );

    if (events.length === 0) {
      console.log('No pending events to resolve');
      return;
    }

    console.log(`Found ${events.length} events to resolve`);
    
    for (const event of events) {
      try {
        const finalPrice = await coingecko.getHistoricalPrice(process.env.CRYPTO_ID || 'bitcoin', event.end_time);
        
        // Update event with final price
        await pool.query(
          `UPDATE events
           SET final_price = $1, resolution_status = 'resolved'
           WHERE id = $2`,
          [finalPrice, event.id]
        );
        
        console.log(`Resolved event ${event.id} with final price: $${finalPrice}`);
        
        // Determine outcome based on price range
        const correctAnswer = coingecko.determinePriceRange(event.initial_price, finalPrice);
        
        // Update event with correct answer
        await pool.query(
          `UPDATE events
           SET correct_answer = $1
           WHERE id = $2`,
          [correctAnswer, event.id]
        );
        
        // Calculate total pot from all participants
        const { rows: [potData] } = await pool.query(
          `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = $1`,
          [event.id]
        );
        
        const totalPot = potData.total_pot || 0;
        
        if (totalPot > 0) {
          // Calculate platform fee (5%) and remaining pot
          const platformFee = Math.floor(totalPot * 0.05);
          const remainingPot = totalPot - platformFee;
          
          // Update event with platform fee
          await pool.query(
            'UPDATE events SET platform_fee = platform_fee + $1 WHERE id = $2',
            [platformFee, event.id]
          );
          
          // Get all winners with their bet amounts
          const { rows: winners } = await pool.query(
            `SELECT user_id, amount, id FROM participants WHERE event_id = $1 AND prediction = $2`,
            [event.id, correctAnswer]
          );
          
          if (winners.length > 0) {
            // Calculate total amount bet by winners
            const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);
            
            // Award proportional share of pot to each winner
            for (const winner of winners) {
              const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * remainingPot);
              
              // Use a client for transaction
              const client = await pool.connect();
              try {
                await client.query('BEGIN');
                
                // Update user points
                await client.query(
                  `UPDATE users SET points = points + $1 WHERE id = $2`,
                  [winnerShare, winner.user_id]
                );
                
                // Record winning outcome
                await client.query(
                  `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                   VALUES ($1, 'win', $2)`,
                  [winner.id, winnerShare]
                );
                
                // Record fee contribution for this participant
                await client.query(
                  'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES ($1, $2, $3)',
                  [event.id, winner.id, Math.floor(winner.amount * 0.05)]
                );
                
                await client.query('COMMIT');
              } catch (error) {
                await client.query('ROLLBACK');
                throw error;
              } finally {
                client.release();
              }
            }

            // Record losing outcomes
            const { rows: losers } = await pool.query(
              `SELECT p.id FROM participants p
               WHERE p.event_id = $1 AND p.prediction != $2`,
              [event.id, correctAnswer]
            );
            
            for (const loser of losers) {
              await pool.query(
                `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                 VALUES ($1, 'loss', 0)`,
                [loser.id]
              );
            }

            // Add audit log entry
            await pool.query(
              `INSERT INTO audit_logs (event_id, action, details)
               VALUES ($1, 'event_resolution', $2)`,
              [event.id, JSON.stringify({
                 totalParticipants: winners.length + losers.length,
                 totalWinners: winners.length,
                 totalPot: totalPot,
                 platformFee: platformFee,
                 distributed: totalWinnerAmount,
                 resolvedAt: new Date().toISOString()
               })]
            );
            
            console.log(`Distributed ${totalPot} points to ${winners.length} winners for event ${event.id}`);
          } else {
            console.log(`No winners for event ${event.id}, pot not distributed`);
          }
        } else {
          console.log(`Event ${event.id} has no pot to distribute`);
        }
      } catch (error) {
        if (error.response) {
            console.error(`Failed to resolve event ${event.id}. API Error: Status ${error.response.status} - ${error.response.statusText}. Data:`, error.response.data);
        } else {
            console.error(`Failed to resolve event ${event.id} with a non-API error:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in resolvePendingEvents:', error);
  }
}
```

## Frontend Fixes Required

### 1. ProfileHistory Component

The ProfileHistory component needs to properly display the points awarded to winners. The current implementation looks correct, but we should verify that the backend is returning the correct data.

## Testing Plan

1. Create a test event
2. Have multiple users participate with different bet amounts
3. Manually trigger event resolution
4. Verify that winners receive the correct proportional share of the pot
5. Verify that the points are correctly displayed in the user's profile history

## Deployment Steps

1. Apply the backend fixes to the resolvePendingEvents function
2. Test the functionality with sample data
3. Deploy to production
4. Monitor for any issues after deployment