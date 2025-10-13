# Implementation Plan for Event Creation Fix

## Issue Summary
No events have been created in the last 24 hours. The daily event creation cron job should create a new Bitcoin prediction event every day at midnight UTC, but this is not happening.

## Root Cause Analysis
Based on the investigation, potential causes include:
1. CoinGecko API integration issues (invalid key, rate limiting, network problems)
2. Database connection or schema issues
3. Cron job execution problems
4. Error handling in the event creation process

## Implementation Steps

### 1. Enhanced Error Logging
Add detailed error logging to the event creation process:

```javascript
// In server.js, enhance the createDailyEvent function
async function createDailyEvent() {
  try {
    console.log('Starting daily event creation process...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Retrieved current Bitcoin price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    // Consider adding alerting/notification here
  }
}
```

### 2. Improved CoinGecko Error Handling
Enhance the coingecko.js library with better error handling:

```javascript
// In lib/coingecko.js, improve error handling
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
      timeout: 5000 // 5 second timeout
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
      data: error.response?.data
    });
    throw error;
  }
}
```

### 3. Fallback Mechanism
Implement a fallback mechanism for event creation:

```javascript
// In server.js, add fallback for event creation
async function createDailyEvent() {
  try {
    console.log('Starting daily event creation process...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Retrieved current Bitcoin price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Primary event creation failed:', error);
    
    // Fallback: Try with default price
    try {
      console.log('Attempting fallback event creation with default price...');
      await createEvent(50000); // Default price
      console.log("Created fallback Bitcoin event with default price: $50000");
    } catch (fallbackError) {
      console.error('Fallback event creation also failed:', fallbackError);
      // Log to monitoring system or send alert
    }
  }
}
```

### 4. Monitoring and Alerting
Add monitoring for cron job execution:

```javascript
// In server.js, add monitoring
let lastEventCreationAttempt = null;
let lastEventCreationSuccess = null;

async function createDailyEvent() {
  lastEventCreationAttempt = new Date();
  
  try {
    console.log('Starting daily event creation process...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Retrieved current Bitcoin price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
    lastEventCreationSuccess = new Date();
  } catch (error) {
    console.error('Error creating daily event:', error);
    // Send alert to monitoring system
  }
}

// Add endpoint to check status
app.get('/api/admin/events/status', authenticateAdmin, async (req, res) => {
  res.json({
    lastAttempt: lastEventCreationAttempt,
    lastSuccess: lastEventCreationSuccess,
    timeSinceLastAttempt: lastEventCreationAttempt ? Date.now() - lastEventCreationAttempt.getTime() : null,
    timeSinceLastSuccess: lastEventCreationSuccess ? Date.now() - lastEventCreationSuccess.getTime() : null
  });
});
```

### 5. Database Health Check
Add database health check for event creation:

```javascript
// In server.js, add database verification before event creation
async function createDailyEvent() {
  try {
    // Verify database connection
    await pool.query('SELECT 1');
    console.log('Database connection verified');
    
    // Verify events table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'events'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('Events table does not exist');
    }
    
    console.log('Events table verified');
    
    // Proceed with event creation
    console.log('Starting daily event creation process...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Retrieved current Bitcoin price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', error);
  }
}
```

## Testing Plan

### 1. Unit Tests for CoinGecko Integration
Create tests for the coingecko.js library to verify proper error handling.

### 2. Integration Tests for Event Creation
Create tests that verify the entire event creation flow works correctly.

### 3. Manual Testing
Use the admin endpoints to manually trigger event creation and verify it works.

## Rollout Strategy

### 1. Development Environment
- Implement changes in development
- Test thoroughly with unit and integration tests
- Verify manual event creation works

### 2. Staging Environment
- Deploy to staging environment
- Monitor for any issues
- Verify cron job execution

### 3. Production Environment
- Deploy during low-traffic period
- Monitor closely for 24 hours
- Verify daily event creation resumes

## Monitoring and Verification

### 1. Immediate Verification
- Use admin endpoint to manually trigger event creation
- Query database to confirm event was created
- Check logs for any error messages

### 2. Ongoing Monitoring
- Check daily that new events are created
- Monitor logs for any errors
- Set up alerts for failed event creation

### 3. Long-term Verification
- Review logs weekly for any recurring issues
- Monitor CoinGecko API usage and rate limits
- Track event creation success rate