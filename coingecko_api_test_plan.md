# CoinGecko API Test Plan

## Objective
Verify that the CoinGecko API key is valid and functioning properly to identify if this is the cause of events not being created.

## Test Steps

### 1. Manual API Key Verification
- Check the COINGECKO_API_KEY value in the .env file
- Verify it matches the expected format
- Confirm it hasn't expired

### 2. Create Test Script (for Code Mode)
When switching to code mode, create a simple Node.js script to test the API:

```javascript
// test_coingecko.js
require('dotenv').config();
const coingecko = require('./backend/lib/coingecko');

async function testCoinGecko() {
  try {
    console.log('Testing CoinGecko API with key:', process.env.COINGECKO_API_KEY ? 'Key present' : 'No key found');
    
    const price = await coingecko.getCurrentPrice('bitcoin');
    console.log('Current Bitcoin price:', price);
    
    console.log('CoinGecko API test: PASSED');
  } catch (error) {
    console.error('CoinGecko API test: FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoinGecko();
```

### 3. Expected Outcomes
- SUCCESS: Script returns current Bitcoin price
- FAILURE: Script returns error message indicating the issue

### 4. Possible Issues
- Invalid API key
- API rate limiting
- Network connectivity problems
- CoinGecko API changes