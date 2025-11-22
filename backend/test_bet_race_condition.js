// Test script to verify the race condition fix in bet placement
const knex = require('knex');
const { betOnEvent } = require('./controllers/eventController');

// Mock database connection (using SQLite in-memory for testing)
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true
});

// Mock request and response objects
const mockReq = {
  params: { id: '1' },
  userId: 1,
  body: { prediction: 'Higher', entryFee: 100 }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.responseData = data;
    return this;
  }
};

// Mock database setup
async function setupTestDatabase() {
  // Create events table
  await db.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('title');
    table.string('description');
    table.json('options');
    table.integer('entry_fee');
    table.datetime('start_time');
    table.datetime('end_time');
    table.string('location');
    table.integer('max_participants');
    table.integer('event_type_id');
    table.string('crypto_symbol');
    table.decimal('initial_price');
    table.string('status').defaultTo('active');
    table.string('resolution_status').defaultTo('pending');
    table.string('external_id').nullable();
    table.decimal('final_price').nullable();
    table.string('correct_answer').nullable();
    table.integer('current_participants').defaultTo(0);
    table.integer('prize_pool').defaultTo(0);
    table.integer('platform_fee').defaultTo(0);
  });

  // Create users table
  await db.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username');
    table.integer('points').defaultTo(1000);
  });

  // Create participants table
  await db.schema.createTable('participants', (table) => {
    table.increments('id').primary();
    table.integer('event_id');
    table.integer('user_id');
    table.string('prediction');
    table.integer('amount');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // Create event_types table
  await db.schema.createTable('event_types', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.string('description');
  });

  // Insert test data
  await db('event_types').insert({ id: 1, name: 'prediction', description: 'Price prediction events' });
  
  // Create an event that ended 1 hour ago
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await db('events').insert({
    id: 1,
    title: 'Test Event',
    description: 'Test event for race condition testing',
    options: JSON.stringify([{ id: 'higher', label: 'Higher', value: 'Higher' }, { id: 'lower', label: 'Lower', value: 'Lower' }]),
    entry_fee: 100,
    start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    end_time: oneHourAgo,
    status: 'active',
    resolution_status: 'pending',
    event_type_id: 1
  });

  // Create a user
  await db('users').insert({ id: 1, username: 'testuser', points: 1000 });
}

async function testRaceConditionPrevention() {
  try {
    console.log('🧪 Testing race condition prevention in bet placement...');
    
    await setupTestDatabase();
    
    // Mock the db object for the controller
    const mockDb = {
      ...db,
      client: {
        config: {
          client: 'sqlite3'
        }
      }
    };

    // Test 1: Try to place a bet on an expired event
    console.log('\n1. Testing bet placement on expired event...');
    await betOnEvent(mockDb, mockReq, mockRes);
    
    if (mockRes.statusCode === 400 && mockRes.responseData?.error === 'Betting closed') {
      console.log('✅ PASS: Betting correctly rejected for expired event');
    } else {
      console.log('❌ FAIL: Betting should have been rejected but was not');
      console.log('Status:', mockRes.statusCode, 'Response:', mockRes.responseData);
    }

    // Test 2: Verify no participant record was created
    const participants = await db('participants').where({ event_id: 1, user_id: 1 });
    if (participants.length === 0) {
      console.log('✅ PASS: No participant record created (transaction rolled back correctly)');
    } else {
      console.log('❌ FAIL: Participant record was created despite betting being closed');
    }

    // Test 3: Verify user points were not deducted
    const user = await db('users').where({ id: 1 }).first();
    if (user.points === 1000) {
      console.log('✅ PASS: User points not deducted (transaction rolled back correctly)');
    } else {
      console.log('❌ FAIL: User points were deducted despite betting being closed');
    }

    // Test 4: Create an active event and test successful bet placement
    console.log('\n2. Testing successful bet placement on active event...');
    const futureTime = new Date(Date.now() + 60 * 60 * 1000);
    await db('events').insert({
      id: 2,
      title: 'Active Test Event',
      description: 'Active test event',
      options: JSON.stringify([{ id: 'higher', label: 'Higher', value: 'Higher' }, { id: 'lower', label: 'Lower', value: 'Lower' }]),
      entry_fee: 100,
      start_time: new Date(),
      end_time: futureTime,
      status: 'active',
      resolution_status: 'pending',
      event_type_id: 1
    });

    const activeReq = {
      params: { id: '2' },
      userId: 1,
      body: { prediction: 'Higher', entryFee: 100 }
    };

    const activeRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    await betOnEvent(mockDb, activeReq, activeRes);
    
    if (activeRes.statusCode === 201) {
      console.log('✅ PASS: Bet successfully placed on active event');
      
      // Verify participant record was created
      const activeParticipants = await db('participants').where({ event_id: 2, user_id: 1 });
      if (activeParticipants.length === 1) {
        console.log('✅ PASS: Participant record created for active event');
      } else {
        console.log('❌ FAIL: Participant record not created for active event');
      }

      // Verify user points were deducted
      const updatedUser = await db('users').where({ id: 1 }).first();
      if (updatedUser.points === 900) {
        console.log('✅ PASS: User points correctly deducted for active event');
      } else {
        console.log('❌ FAIL: User points not deducted correctly');
      }
    } else {
      console.log('❌ FAIL: Bet should have been accepted but was rejected');
      console.log('Status:', activeRes.statusCode, 'Response:', activeRes.responseData);
    }

    console.log('\n🎯 Race condition prevention test completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await db.destroy();
  }
}

// Run the test
testRaceConditionPrevention();