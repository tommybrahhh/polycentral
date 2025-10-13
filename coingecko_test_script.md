# CoinGecko Test Script

This script can be used to test the CoinGecko API integration:

```javascript
// test_coingecko.js
const coingecko = require('./lib/coingecko');
require('dotenv').config();

async function testCoinGecko() {
  try {
    console.log('Testing CoinGecko API with key:', process.env.COINGECKO_API_KEY ? 'Key present' : 'No key found');
    
    // Test getCurrentPrice
    console.log('Testing getCurrentPrice...');
    const price = await coingecko.getCurrentPrice('bitcoin');
    console.log('Current Bitcoin price:', price);
    
    // Test calculatePriceRanges
    console.log('Testing calculatePriceRanges...');
    const ranges = coingecko.calculatePriceRanges(price);
    console.log('Price ranges:', JSON.stringify(ranges, null, 2));
    
    console.log('CoinGecko API test: PASSED');
  } catch (error) {
    console.error('CoinGecko API test: FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoinGecko();
```

To run this test:
1. Save the script as `test_coingecko.js` in the backend directory
2. Run with `node test_coingecko.js` from the backend directory