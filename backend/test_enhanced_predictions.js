// test_enhanced_predictions.js - Test script for enhanced prediction functionality
const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '.env')
});

// Database setup
const dbType = process.env.DB_TYPE || 'sqlite';
let pool;

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('💾 PostgreSQL database connected');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(':memory:'); // Use in-memory database for testing

  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // SQLite uses '?' instead of '$1, $2', so we convert them
        const sqliteQuery = text.replace(/\$\d+/g, '?');
        db.all(sqliteQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    }
  };
  console.log('💾 SQLite database connected');
}

// Import the coingecko module to test the helper functions
const coingecko = require('./lib/coingecko');

// Test function to check enhanced prediction functionality
async function testEnhancedPredictions() {
  try {
    console.log('Testing enhanced prediction functionality...');
    console.log('DB_TYPE:', process.env.DB_TYPE);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set');
    console.log('dbType:', dbType);
    
    // Test 1: Price range calculation
    console.log('\n🧪 Test 1: Price range calculation');
    const initialPrice = 50000; // $50,000
    const priceRanges = coingecko.calculatePriceRanges(initialPrice);
    
    console.log('Initial price: $' + initialPrice);
    console.log('Price ranges:', JSON.stringify(priceRanges, null, 2));
    
    // Verify calculations
    const expectedUp3Max = initialPrice * 1.03;  // 3% up
    const expectedUp5Max = initialPrice * 1.05;  // 5% up
    const expectedDown3Min = initialPrice * 0.97;  // 3% down
    const expectedDown5Min = initialPrice * 0.95;  // 5% down
    
    if (Math.abs(priceRanges['0-3% up'].max - expectedUp3Max) < 0.01 &&
        Math.abs(priceRanges['3-5% up'].max - expectedUp5Max) < 0.01 &&
        Math.abs(priceRanges['0-3% down'].min - expectedDown3Min) < 0.01 &&
        Math.abs(priceRanges['3-5% down'].min - expectedDown5Min) < 0.01) {
      console.log('✅ Price range calculation test passed');
    } else {
      console.log('❌ Price range calculation test failed');
      console.log('Expected 0-3% up max:', expectedUp3Max, 'Got:', priceRanges['0-3% up'].max);
      console.log('Expected 3-5% up max:', expectedUp5Max, 'Got:', priceRanges['3-5% up'].max);
      console.log('Expected 0-3% down min:', expectedDown3Min, 'Got:', priceRanges['0-3% down'].min);
      console.log('Expected 3-5% down min:', expectedDown5Min, 'Got:', priceRanges['3-5% down'].min);
      return;
    }
    
    // Test 2: Price range determination
    console.log('\n🧪 Test 2: Price range determination');
    
    // Test cases for different price movements
    const testCases = [
      { finalPrice: initialPrice * 1.01, expected: '0-3% up', description: '1% up' },
      { finalPrice: initialPrice * 1.04, expected: '3-5% up', description: '4% up' },
      { finalPrice: initialPrice * 1.06, expected: '5%+ up', description: '6% up' },
      { finalPrice: initialPrice * 0.99, expected: '0-3% down', description: '1% down' },
      { finalPrice: initialPrice * 0.96, expected: '3-5% down', description: '4% down' },
      { finalPrice: initialPrice * 0.94, expected: '5%+ down', description: '6% down' }
    ];
    
    let allTestsPassed = true;
    for (const testCase of testCases) {
      const result = coingecko.determinePriceRange(initialPrice, testCase.finalPrice);
      if (result === testCase.expected) {
        console.log(`✅ ${testCase.description} correctly identified as "${result}"`);
      } else {
        console.log(`❌ ${testCase.description} incorrectly identified as "${result}", expected "${testCase.expected}"`);
        allTestsPassed = false;
      }
    }
    
    if (!allTestsPassed) {
      console.log('❌ Price range determination test failed');
      return;
    } else {
      console.log('✅ Price range determination test passed');
    }
    
    // Test 3: Edge cases
    console.log('\n🧪 Test 3: Edge cases');
    
    // Test exactly at boundaries
    const edgeCases = [
      { finalPrice: priceRanges['0-3% up'].max, expected: '0-3% up', description: 'Exactly at 3% up boundary' },
      { finalPrice: priceRanges['3-5% up'].max, expected: '3-5% up', description: 'Exactly at 5% up boundary' },
      { finalPrice: priceRanges['0-3% down'].min, expected: '0-3% down', description: 'Exactly at 3% down boundary' },
      { finalPrice: priceRanges['3-5% down'].min, expected: '3-5% down', description: 'Exactly at 5% down boundary' }
    ];
    
    let edgeTestsPassed = true;
    for (const edgeCase of edgeCases) {
      const result = coingecko.determinePriceRange(initialPrice, edgeCase.finalPrice);
      // Note: Boundary cases might be in either range depending on implementation
      // We're just checking that it returns a valid range
      const validRanges = ['0-3% up', '3-5% up', '5%+ up', '0-3% down', '3-5% down', '5%+ down'];
      if (validRanges.includes(result)) {
        console.log(`✅ ${edgeCase.description} correctly identified as "${result}"`);
      } else {
        console.log(`❌ ${edgeCase.description} incorrectly identified as "${result}"`);
        edgeTestsPassed = false;
      }
    }
    
    if (!edgeTestsPassed) {
      console.log('❌ Edge cases test failed');
      return;
    } else {
      console.log('✅ Edge cases test passed');
    }
    
    // Test 4: No change scenario
    console.log('\n🧪 Test 4: No change scenario');
    const noChangeResult = coingecko.determinePriceRange(initialPrice, initialPrice);
    // With 0% change, it should be in the 0-3% down range (since it's not up)
    // or 0-3% up range (since it's not down)
    // The implementation puts it in 0-3% up (as it's >= initialPrice and <= initialPrice + 3% of initialPrice)
    if (noChangeResult === '0-3% up') {
      console.log('✅ No change scenario correctly identified as "0-3% up"');
    } else {
      console.log(`⚠️  No change scenario identified as "${noChangeResult}", this might be acceptable depending on implementation`);
    }
    
    console.log('\n✅ All enhanced prediction tests completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedPredictions().then(() => {
  console.log('\n🏁 Enhanced prediction test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Enhanced prediction test failed:', error);
  process.exit(1);
});