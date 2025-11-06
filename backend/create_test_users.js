// Simple script to create test users for leaderboard testing
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env')
});

const knex = require('knex');
const knexConfig = require('./knexfile');

// Initialize Knex with proper SQLite connection
const db = knex({
  ...knexConfig.development,
  connection: {
    filename: path.join(__dirname, 'database.sqlite')
  }
});

async function createTestUsers() {
  try {
    console.log('Creating test users for leaderboard...');
    
    // Create test users with different point values
    const testUsers = [
      { username: 'user1', email: 'user1@test.com', points: 5000 },
      { username: 'user2', email: 'user2@test.com', points: 3000 },
      { username: 'user3', email: 'user3@test.com', points: 7000 },
      { username: 'user4', email: 'user4@test.com', points: 2000 },
      { username: 'user5', email: 'user5@test.com', points: 10000 },
      { username: 'user6', email: 'user6@test.com', points: 1500 },
      { username: 'user7', email: 'user7@test.com', points: 4500 },
      { username: 'user8', email: 'user8@test.com', points: 6000 },
      { username: 'user9', email: 'user9@test.com', points: 2500 },
      { username: 'user10', email: 'user10@test.com', points: 8000 }
    ];

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await db('users').where('username', user.username).first();
      
      if (!existingUser) {
        const passwordHash = await require('bcrypt').hash('test123', 10);
        await db('users').insert({
          username: user.username,
          email: user.email,
          password_hash: passwordHash,
          points: user.points,
          last_login_date: new Date()
        });
        console.log(`Created user: ${user.username} with ${user.points} points`);
      } else {
        console.log(`User ${user.username} already exists, updating points to ${user.points}`);
        await db('users').where('username', user.username).update({
          points: user.points
        });
      }
    }

    console.log('Test users created successfully!');
    console.log('You can now test the leaderboard endpoint at: http://localhost:8080/api/leaderboard?page=1&limit=10');
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await db.destroy();
  }
}

createTestUsers();