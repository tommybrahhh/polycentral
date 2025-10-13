# Event Creation Fix Plan

## Issues Identified

1. **Incorrect Cron Job Comment**: Line 2217 in `server.js` has an incorrect comment stating that `0 0 * * *` means "at minute 0 of every hour" when it actually means "at midnight every day".

2. **Duplicate Cron Job Scheduling**: Both `createDailyEvent` and `resolvePendingEvents` are scheduled with the same cron pattern `0 0 * * *`, which means they both run at midnight every day. This could potentially cause conflicts.

3. **Lack of Error Handling**: The `createDailyEvent` function has basic error handling, but it doesn't log enough information to diagnose issues.

4. **No Fallback Mechanism**: If the CoinGecko API fails, there's no fallback to create events with a default price.

## Proposed Fixes

### 1. Correct the Cron Job Comment
```javascript
// Schedule cron jobs
cron.schedule('0 0 * * *', createDailyEvent); // Run daily at midnight UTC
cron.schedule('0 0 * * *', resolvePendingEvents); // Run daily at midnight UTC
```

### 2. Add Enhanced Error Logging to createDailyEvent
```javascript
// --- Daily Event Creation Function ---
async function createDailyEvent() {
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Daily event creation triggered with price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try fallback with default price
    try {
      console.log('Attempting fallback event creation with default price...');
      await createEvent(50000); // Default price
      console.log("Created fallback Bitcoin event with default price: $50000");
    } catch (fallbackError) {
      console.error('Fallback event creation also failed:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

### 3. Add Monitoring Endpoint
```javascript
// Add endpoint to check event creation status
let lastEventCreationAttempt = null;
let lastEventCreationSuccess = null;

// Modify createDailyEvent to update these variables
async function createDailyEvent() {
  lastEventCreationAttempt = new Date();
  
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Daily event creation triggered with price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
    lastEventCreationSuccess = new Date();
  } catch (error) {
    console.error('Error creating daily event:', error);
  }
}

// Add monitoring endpoint
app.get('/api/admin/events/status', authenticateAdmin, async (req, res) => {
  res.json({
    lastAttempt: lastEventCreationAttempt,
    lastSuccess: lastEventCreationSuccess,
    timeSinceLastAttempt: lastEventCreationAttempt ? Date.now() - lastEventCreationAttempt.getTime() : null,
    timeSinceLastSuccess: lastEventCreationSuccess ? Date.now() - lastEventCreationSuccess.getTime() : null
  });
});
```

### 4. Improve CoinGecko Error Handling
```javascript
// In lib/coingecko.js, enhance error handling
async function getCurrentPrice(cryptoId) {
  try {
    const response = await axios.get(`${API_URL}/simple/price`, {
      params: {
        ids: cryptoId,
        vs_currencies: 'usd'
      },
      headers: {
        'x-cg-demo-api-key': API_KEY
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (!response.data[cryptoId]) {
      throw new Error(`No price data for ${cryptoId}`);
    }
    
    return response.data[cryptoId].usd;
  } catch (error) {
    console.error('CoinGecko API error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
```

## Testing Plan

1. **Manual Testing**: Use the admin endpoint to manually trigger event creation
2. **Database Verification**: Check that events are being created in the database
3. **CoinGecko API Testing**: Verify that the CoinGecko API is working correctly
4. **Cron Job Verification**: Confirm that cron jobs are scheduled correctly

## Rollout Steps

1. Implement the enhanced error logging and fallback mechanism
2. Correct the cron job comment
3. Add the monitoring endpoint
4. Improve CoinGecko error handling
5. Test manually using the admin endpoint
6. Verify events are created in the database
7. Monitor for 24 hours to ensure automatic creation works