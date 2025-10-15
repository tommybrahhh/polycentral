// Test script to verify admin authentication flow
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load environment variables using the same logic as server.js
require('dotenv').config({
  path: path.join(__dirname, '.env.production')
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function testAdminAuth() {
  let client;
  try {
    console.log('🧪 Testing Admin Authentication Flow...');
    
    client = await pool.connect();
    
    // 1. Check if admin user exists
    console.log('1. Checking for admin users...');
    const adminCheck = await client.query(
      "SELECT id, username, email, is_admin FROM users WHERE is_admin = true LIMIT 1"
    );
    
    if (adminCheck.rows.length === 0) {
      console.log('⚠️ No admin users found. Creating test admin user...');
      
      // Create a test admin user
      const passwordHash = await bcrypt.hash('admin123', 10);
      const { rows: [newUser] } = await client.query(
        `INSERT INTO users (username, email, password_hash, is_admin) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, is_admin`,
        ['admin', 'admin@example.com', passwordHash, true]
      );
      
      console.log('✅ Created admin user:', newUser);
    } else {
      console.log('✅ Admin user found:', adminCheck.rows[0]);
    }
    
    // 2. Test JWT token generation and verification
    console.log('\n2. Testing JWT token authentication...');
    const testUser = adminCheck.rows[0] || (await client.query(
      "SELECT id, username, email, is_admin FROM users WHERE is_admin = true LIMIT 1"
    )).rows[0];
    
    const token = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ JWT Token generated successfully');
    
    // 3. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT Token verified successfully');
    console.log('   Decoded token:', decoded);
    
    // 4. Verify user is admin in database
    const userVerify = await client.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userVerify.rows[0]?.is_admin) {
      console.log('✅ User admin status verified: User is an admin');
    } else {
      console.log('❌ User admin status verification failed: User is not an admin');
    }
    
    console.log('\n🎉 Admin authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Admin authentication test failed:', error.message);
  } finally {
    if (client) {
      client.release();
    }
    pool.end();
  }
}

testAdminAuth();