const http = require('http');
const knex = require('knex');
const knexConfig = require('./knexfile');

// Test the leaderboard endpoint with different parameters
function testLeaderboard(page = 1, limit = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/leaderboard?page=${page}&limit=${limit}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Page: ${page}, Limit: ${limit}`);
        console.log(`Status Code: ${res.statusCode}`);
        
        try {
          const parsedData = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsedData, null, 2));
          console.log('---');
          resolve(parsedData);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          console.log('Raw response:', data);
          reject(parseError);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.end();
  });
}

// Check database for users and create test users if needed
async function ensureTestUsers() {
  try {
    const db = knex({
      ...knexConfig.development,
      connection: { filename: './database.sqlite' }
    });

    console.log('Checking database for users...');
    const users = await db.raw('SELECT id, username, points FROM users ORDER BY points DESC');
    console.log('Users in database:', users.rows);
    
    if (users.rows.length === 0) {
      console.log('No users found in database. Creating test users...');
      await require('./create_test_users.js');
      
      // Check again after creating users
      const newUsers = await db.raw('SELECT id, username, points FROM users ORDER BY points DESC');
      console.log('Users after creation:', newUsers.rows);
    }

    await db.destroy();
  } catch (error) {
    console.error('Database check failed:', error);
  }
}

// Test different pagination scenarios
async function runTests() {
  try {
    console.log('Testing leaderboard endpoint...\n');
    
    // First ensure we have test users
    await ensureTestUsers();
    
    // Test 1: Default parameters
    await testLeaderboard(1, 5);
    
    // Test 2: Second page with 3 items
    await testLeaderboard(2, 3);
    
    // Test 3: Large limit
    await testLeaderboard(1, 10);
    
    // Test 4: Invalid page (should still work)
    await testLeaderboard(0, 5);
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();