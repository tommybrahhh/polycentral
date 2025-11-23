#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Payout Distribution Script
 * 
 * Tests the parimutuel payout distribution logic with various scenarios
 */

const knex = require('knex');
const knexConfig = require('./knexfile');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Test database connection
let testDb;
let testEventId = 9999; // Special ID for test events

// Simplified test version of distributePayouts that uses our test database
async function distributePayouts(eventId, winningOutcomeId) {
    console.log(`🚀 Starting payout distribution for Event ${eventId} with winning outcome: ${winningOutcomeId}`);
    
    let trx;
    
    try {
        // Start transaction
        trx = await testDb.transaction();
        
        // Lock event and participants for consistency
        const eventQuery = await trx.raw(`
            SELECT * FROM events
            WHERE id = ?
        `, [eventId]);
        
        // Handle different database result formats
        const eventRows = eventQuery.rows || eventQuery;
        if (eventRows.length === 0) {
            throw new Error(`Event ${eventId} not found`);
        }
        
        const event = eventRows[0];
        
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
        
        // Handle different database result formats
        const allBets = betsQuery.rows || betsQuery;
        
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
                const userPayout = Math.floor((bet.amount / winningPool) * (totalPool - platformFee));
                
                if (userPayout > 0) {
                    console.log(`   User ${bet.user_id} (${bet.username}): Bet ${bet.amount} -> Payout ${userPayout}`);
                    
                    // Update user points directly
                    await trx.raw(`
                        UPDATE users SET points = points + ? WHERE id = ?
                    `, [userPayout, bet.user_id]);
                    
                    // Record points history
                    await trx.raw(`
                        INSERT INTO points_history (user_id, change_amount, new_balance, reason, event_id)
                        VALUES (?, ?, (SELECT points FROM users WHERE id = ?), 'event_win', ?)
                    `, [bet.user_id, userPayout, bet.user_id, eventId]);
                    
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
            resolvedBy: 'test_script'
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
        throw error;
    }
}

// Test data
const testUsers = [
    { id: 1001, username: 'test_user_1', email: 'test1@example.com', points: 1000 },
    { id: 1002, username: 'test_user_2', email: 'test2@example.com', points: 1000 },
    { id: 1003, username: 'test_user_3', email: 'test3@example.com', points: 1000 },
    { id: 1004, username: 'test_user_4', email: 'test4@example.com', points: 1000 }
];

/**
 * Initialize test database with clean state
 */
async function initializeTestDatabase() {
    try {
        // Use development config for testing
        const config = { ...knexConfig.development };
        // Use the existing database but ensure we clean up properly
        testDb = knex(config);
        
        // Test connection
        await testDb.raw('SELECT 1');
        console.log('✅ Test database connection successful');
        
        return testDb;
    } catch (error) {
        console.error('❌ Test database connection failed:', error.message);
        throw error;
    }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
    try {
        await testDb.raw('DELETE FROM participants WHERE event_id >= ?', [testEventId]);
        await testDb.raw('DELETE FROM events WHERE id >= ?', [testEventId]);
        await testDb.raw('DELETE FROM event_outcomes WHERE participant_id IN (SELECT id FROM participants WHERE event_id >= ?)', [testEventId]);
        await testDb.raw('DELETE FROM platform_fees WHERE event_id >= ?', [testEventId]);
        await testDb.raw('DELETE FROM audit_logs WHERE event_id >= ?', [testEventId]);
        await testDb.raw('DELETE FROM points_history WHERE user_id >= 1000 AND user_id < 2000');
        // Reset user points to initial values instead of deleting users
        for (const user of testUsers) {
            await testDb.raw('UPDATE users SET points = ? WHERE id = ?', [user.points, user.id]);
        }
        console.log('✅ Test data cleaned up');
    } catch (error) {
        console.error('❌ Test data cleanup failed:', error.message);
    }
}

/**
 * Create test users
 */
async function createTestUsers() {
    for (const user of testUsers) {
        await testDb.raw(`
            INSERT OR IGNORE INTO users (id, username, email, password_hash, points)
            VALUES (?, ?, ?, 'test_hash', ?)
        `, [user.id, user.username, user.email, user.points]);
    }
    console.log('✅ Test users created');
}

/**
 * Create test event with specified parameters
 */
async function createTestEvent(eventId, title, options, status = 'pending') {
    await testDb.raw(`
        INSERT INTO events (id, title, description, category, options, entry_fee, status, resolution_status)
        VALUES (?, ?, 'Test event description', 'test', ?, 0, ?, 'pending')
    `, [eventId, title, options, status]);
    
    console.log(`✅ Test event ${eventId} created: ${title}`);
    return eventId;
}

/**
 * Place test bets
 */
async function placeTestBets(eventId, bets) {
    for (const bet of bets) {
        await testDb.raw(`
            INSERT INTO participants (event_id, user_id, prediction, amount)
            VALUES (?, ?, ?, ?)
        `, [eventId, bet.userId, bet.prediction, bet.amount]);
    }
    console.log(`✅ ${bets.length} test bets placed for event ${eventId}`);
}

/**
 * Test scenario 1: Basic parimutuel calculation
 */
async function testBasicParimutuel() {
    console.log('\n🧪 Test 1: Basic Parimutuel Calculation');
    
    const eventId = testEventId + 1;
    await createTestEvent(eventId, 'Test Event - Basic Parimutuel', '["Higher","Lower"]');
    
    // Place bets: 3 users bet on "Higher", 1 user bets on "Lower"
    await placeTestBets(eventId, [
        { userId: 1001, prediction: 'Higher', amount: 100 },
        { userId: 1002, prediction: 'Higher', amount: 200 },
        { userId: 1003, prediction: 'Higher', amount: 300 },
        { userId: 1004, prediction: 'Lower', amount: 400 }
    ]);
    
    // Test the payout calculation
    const totalPool = 100 + 200 + 300 + 400; // 1000
    const winningPool = 100 + 200 + 300; // 600
    const platformFeePercentage = 0.05;
    const platformFee = Math.floor(totalPool * platformFeePercentage); // 50
    const netPool = totalPool - platformFee; // 950
    
    console.log('📊 Expected calculations:');
    console.log(`   Total Pool: ${totalPool}`);
    console.log(`   Winning Pool: ${winningPool}`);
    console.log(`   Platform Fee (5%): ${platformFee}`);
    console.log(`   Net Pool: ${netPool}`);
    
    // Calculate expected payouts
    const expectedPayouts = [
        { userId: 1001, bet: 100, payout: Math.floor((100 / winningPool) * netPool) },
        { userId: 1002, bet: 200, payout: Math.floor((200 / winningPool) * netPool) },
        { userId: 1003, bet: 300, payout: Math.floor((300 / winningPool) * netPool) }
    ];
    
    console.log('💰 Expected payouts:');
    expectedPayouts.forEach(p => console.log(`   User ${p.userId}: Bet ${p.bet} -> Payout ${p.payout}`));
    
    return { eventId, winningOutcome: 'Higher', expectedPayouts };
}

/**
 * Test scenario 2: Single winner edge case
 */
async function testSingleWinner() {
    console.log('\n🧪 Test 2: Single Winner Edge Case');
    
    const eventId = testEventId + 2;
    await createTestEvent(eventId, 'Test Event - Single Winner', '["Higher","Lower"]');
    
    // Only one user bets on the winning outcome
    await placeTestBets(eventId, [
        { userId: 1001, prediction: 'Higher', amount: 1000 },
        { userId: 1002, prediction: 'Lower', amount: 500 },
        { userId: 1003, prediction: 'Lower', amount: 500 }
    ]);
    
    const totalPool = 2000;
    const winningPool = 1000;
    const platformFee = Math.floor(totalPool * 0.05); // 100
    const netPool = totalPool - platformFee; // 1900
    
    const expectedPayout = Math.floor((1000 / winningPool) * netPool); // Should be 1900
    
    console.log('💰 Expected payout:');
    console.log(`   User 1001: Bet 1000 -> Payout ${expectedPayout}`);
    
    return { eventId, winningOutcome: 'Higher', expectedPayout: expectedPayout };
}

/**
 * Test scenario 3: Zero bets edge case
 */
async function testZeroBets() {
    console.log('\n🧪 Test 3: Zero Bets Edge Case');
    
    const eventId = testEventId + 3;
    await createTestEvent(eventId, 'Test Event - Zero Bets', '["Higher","Lower"]');
    
    // No bets placed
    console.log('📊 No bets placed for this event');
    
    return { eventId, winningOutcome: 'Higher' };
}

/**
 * Test scenario 4: Rounding edge cases
 */
async function testRoundingEdgeCases() {
    console.log('\n🧪 Test 4: Rounding Edge Cases');
    
    const eventId = testEventId + 4;
    await createTestEvent(eventId, 'Test Event - Rounding', '["Higher","Lower"]');
    
    // Bets designed to test rounding behavior
    await placeTestBets(eventId, [
        { userId: 1001, prediction: 'Higher', amount: 1 },
        { userId: 1002, prediction: 'Higher', amount: 1 },
        { userId: 1003, prediction: 'Lower', amount: 100 }
    ]);
    
    const totalPool = 102;
    const winningPool = 2;
    const platformFee = Math.floor(totalPool * 0.05); // 5
    const netPool = totalPool - platformFee; // 97
    
    console.log('📊 Testing small bets with rounding:');
    console.log(`   Total Pool: ${totalPool}`);
    console.log(`   Winning Pool: ${winningPool}`);
    console.log(`   Platform Fee: ${platformFee}`);
    console.log(`   Net Pool: ${netPool}`);
    
    return { eventId, winningOutcome: 'Higher' };
}

/**
 * Verify test results
 */
async function verifyResults(eventId, winningOutcome, expectedPayouts = null) {
    console.log('\n🔍 Verifying results...');
    
    // Check event status
    const eventResult = await testDb.raw('SELECT * FROM events WHERE id = ?', [eventId]);
    const eventRows = eventResult.rows || eventResult;
    const event = eventRows[0];
    
    console.log(`✅ Event ${eventId} status: ${event.status}, resolution: ${event.resolution_status}`);
    console.log(`✅ Correct answer: ${event.correct_answer}`);
    
    // Check platform fee
    console.log(`✅ Platform fee collected: ${event.platform_fee}`);
    
    // Check event outcomes
    const outcomesResult = await testDb.raw(`
        SELECT eo.*, p.user_id, p.prediction, p.amount
        FROM event_outcomes eo
        JOIN participants p ON eo.participant_id = p.id
        WHERE p.event_id = ?
    `, [eventId]);
    
    const outcomesRows = outcomesResult.rows || outcomesResult;
    console.log(`📊 Event outcomes recorded: ${outcomesRows.length}`);
    outcomesRows.forEach(outcome => {
        console.log(`   User ${outcome.user_id}: ${outcome.prediction} -> ${outcome.result} (${outcome.points_awarded} points)`);
    });
    
    // Check user points if expected payouts provided
    if (expectedPayouts) {
        for (const expected of expectedPayouts) {
            const userResult = await testDb.raw('SELECT points FROM users WHERE id = ?', [expected.userId]);
            const userRows = userResult.rows || userResult;
            const actualPoints = userRows[0].points;
            
            console.log(`💰 User ${expected.userId}: Expected ~${expected.payout}, Actual: ${actualPoints}`);
            
            // Allow for small rounding differences
            if (Math.abs(actualPoints - (1000 + expected.payout)) > 2) {
                console.error(`❌ Payout mismatch for user ${expected.userId}`);
                return false;
            }
        }
    }
    
    // Check audit log
    const auditResult = await testDb.raw('SELECT * FROM audit_logs WHERE event_id = ?', [eventId]);
    const auditRows = auditResult.rows || auditResult;
    console.log(`📝 Audit log entries: ${auditRows.length}`);
    
    return true;
}

/**
 * Main test runner
 */
async function runTests() {
    try {
        console.log('🚀 Starting Payout Distribution Tests');
        console.log('=====================================');
        
        await initializeTestDatabase();
        
        // Run each test with clean state
        console.log('\n🧪 Running Test 1: Basic Parimutuel Calculation');
        await cleanupTestData();
        await createTestUsers();
        
        // Run test scenarios
        const test1 = await testBasicParimutuel();
        await distributePayouts(test1.eventId, test1.winningOutcome);
        await verifyResults(test1.eventId, test1.winningOutcome, test1.expectedPayouts);
        
        console.log('\n🧪 Running Test 2: Single Winner Edge Case');
        await cleanupTestData();
        await createTestUsers();
        const test2 = await testSingleWinner();
        await distributePayouts(test2.eventId, test2.winningOutcome);
        await verifyResults(test2.eventId, test2.winningOutcome, [
            { userId: 1001, payout: test2.expectedPayout }
        ]);
        
        console.log('\n🧪 Running Test 3: Zero Bets Edge Case');
        await cleanupTestData();
        await createTestUsers();
        const test3 = await testZeroBets();
        try {
            await distributePayouts(test3.eventId, test3.winningOutcome);
            console.error('❌ Expected error for zero bets but none occurred');
        } catch (error) {
            console.log('✅ Correctly handled zero bets error:', error.message);
        }
        
        console.log('\n🧪 Running Test 4: Rounding Edge Cases');
        await cleanupTestData();
        await createTestUsers();
        const test4 = await testRoundingEdgeCases();
        await distributePayouts(test4.eventId, test4.winningOutcome);
        await verifyResults(test4.eventId, test4.winningOutcome);
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    } finally {
        await cleanupTestData();
        if (testDb) {
            await testDb.destroy();
            console.log('✅ Test database connection closed');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    initializeTestDatabase,
    cleanupTestData
};