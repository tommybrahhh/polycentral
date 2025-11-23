#!/usr/bin/env node

/**
 * Distribute Payouts Script
 * 
 * Manual parimutuel payout distribution for prediction events
 * Usage: node backend/distribute_payouts.js <event_id> <winning_outcome_id>
 */

const knex = require('knex');
const knexConfig = require('./knexfile');
const { updateUserPoints } = require('./utils/pointsUtils');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database connection
let db;

// Parse command line arguments
function parseArguments() {
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
        console.error('Usage: node backend/distribute_payouts.js <event_id> <winning_outcome_id>');
        console.error('Example: node backend/distribute_payouts.js 123 "Higher"');
        process.exit(1);
    }

    const eventId = parseInt(args[0]);
    const winningOutcomeId = args[1];

    if (isNaN(eventId) || eventId <= 0) {
        console.error('Error: Event ID must be a positive integer');
        process.exit(1);
    }

    if (!winningOutcomeId || typeof winningOutcomeId !== 'string') {
        console.error('Error: Winning outcome ID must be a valid string');
        process.exit(1);
    }

    return { eventId, winningOutcomeId };
}

// Initialize database connection
async function initializeDatabase() {
    try {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        const config = isProduction ? knexConfig.production : knexConfig.development;
        
        db = knex(config);
        
        // Test connection
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');
        
        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Calculate parimutuel payouts
function calculatePayouts(totalPool, platformFeePercentage, winningPool, userBetAmount) {
    const platformFee = Math.floor(totalPool * platformFeePercentage);
    const netPool = totalPool - platformFee;
    
    if (winningPool === 0) {
        return { userPayout: 0, platformFee: 0 };
    }
    
    const userPayout = Math.floor((userBetAmount / winningPool) * netPool);
    return { userPayout, platformFee };
}

// Main payout distribution function
async function distributePayouts(eventId, winningOutcomeId) {
    let trx;
    
    try {
        console.log(`🚀 Starting payout distribution for Event ${eventId} with winning outcome: ${winningOutcomeId}`);
        
        // Start transaction
        trx = await db.transaction();
        
        // Lock event and participants for consistency
        const eventQuery = await trx.raw(`
            SELECT * FROM events 
            WHERE id = ? 
            FOR UPDATE
        `, [eventId]);
        
        if (eventQuery.rows.length === 0) {
            throw new Error(`Event ${eventId} not found`);
        }
        
        const event = eventQuery.rows[0];
        
        // Check if event is already resolved
        if (event.resolution_status === 'resolved') {
            throw new Error(`Event ${eventId} is already resolved`);
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
            throw new Error(`No bets found for event ${eventId}`);
        }
        
        // Calculate pools
        const totalPool = allBets.reduce((sum, bet) => sum + bet.amount, 0);
        const winningBets = allBets.filter(bet => bet.prediction === winningOutcomeId);
        const winningPool = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
        
        console.log(`📊 Event ${eventId} Pool Summary:`);
        console.log(`   Total Pool: ${totalPool} points`);
        console.log(`   Winning Pool: ${winningPool} points`);
        console.log(`   Total Bets: ${allBets.length}`);
        console.log(`   Winning Bets: ${winningBets.length}`);
        
        // Calculate platform fee (5%)
        const platformFeePercentage = 0.05;
        const platformFee = Math.floor(totalPool * platformFeePercentage);
        
        console.log(`   Platform Fee (5%): ${platformFee} points`);
        console.log(`   Net Pool (after fee): ${totalPool - platformFee} points`);
        
        // Update event with platform fee
        await trx.raw(`
            UPDATE events 
            SET platform_fee = platform_fee + ?
            WHERE id = ?
        `, [platformFee, eventId]);
        
        // Distribute payouts to winners
        if (winningBets.length > 0) {
            console.log(`💰 Distributing payouts to ${winningBets.length} winners...`);
            
            for (const bet of winningBets) {
                const { userPayout } = calculatePayouts(totalPool, platformFeePercentage, winningPool, bet.amount);
                
                if (userPayout > 0) {
                    console.log(`   User ${bet.user_id} (${bet.username}): Bet ${bet.amount} -> Payout ${userPayout}`);
                    
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
        const losingBets = allBets.filter(bet => bet.prediction !== winningOutcomeId);
        if (losingBets.length > 0) {
            console.log(`📝 Recording ${losingBets.length} losing outcomes...`);
            
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
        `, [winningOutcomeId, eventId]);
        
        // Add audit log entry
        await trx.raw(`
            INSERT INTO audit_logs (event_id, action, details)
            VALUES (?, 'manual_payout_distribution', ?)
        `, [eventId, JSON.stringify({
            totalParticipants: allBets.length,
            totalWinners: winningBets.length,
            totalPot: totalPool,
            platformFee: platformFee,
            distributed: totalPool - platformFee,
            resolvedAt: new Date().toISOString(),
            winningOutcome: winningOutcomeId,
            resolvedBy: 'manual_script'
        })]);
        
        // Commit transaction
        await trx.commit();
        
        console.log('✅ Payout distribution completed successfully!');
        console.log(`🎉 Event ${eventId} resolved with outcome: ${winningOutcomeId}`);
        console.log(`💰 Total distributed: ${totalPool - platformFee} points to ${winningBets.length} winners`);
        
    } catch (error) {
        // Rollback transaction on error
        if (trx) {
            await trx.rollback();
            console.error('❌ Transaction rolled back due to error');
        }
        
        console.error('❌ Payout distribution failed:', error.message);
        process.exit(1);
    }
}

// Main execution
async function main() {
    try {
        const { eventId, winningOutcomeId } = parseArguments();
        
        console.log('📋 Payout Distribution Script');
        console.log('=============================');
        console.log(`Event ID: ${eventId}`);
        console.log(`Winning Outcome: ${winningOutcomeId}`);
        console.log('');
        
        await initializeDatabase();
        await distributePayouts(eventId, winningOutcomeId);
        
    } catch (error) {
        console.error('❌ Script execution failed:', error.message);
        process.exit(1);
    } finally {
        // Clean up database connection
        if (db) {
            await db.destroy();
            console.log('✅ Database connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { distributePayouts };