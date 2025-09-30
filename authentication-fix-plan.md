# Fix Plan for 400 Bad Request Error on /api/events/active Endpoint

## Issue Analysis

After analyzing the codebase, I've identified the root cause of the 400 Bad Request error when fetching active events from the `/api/events/active` endpoint:

1. **Current State**: The `/api/events/active` endpoint in `backend/server.js` does not require authentication (no `authenticateToken` middleware)
2. **Problem**: The frontend is making requests to this endpoint without authentication headers, but the backend is working correctly
3. **CORS Configuration**: The CORS settings in `backend/.env` and `backend/.env.production` are correctly configured for the frontend domains
4. **Root Cause**: The error is not actually with the `/api/events/active` endpoint itself but likely with the request being made incorrectly

## Current Implementation Analysis

### Backend (`backend/server.js`)
```javascript
app.get('/api/events/active', async (req, res) => {
  // This endpoint does not require authentication
  // It correctly returns active events
  // ...
});
```

### Frontend (`frontend/src/App.jsx`)
```javascript
const fetchEvents = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
    setEvents(response.data);
  } catch (error) {
    console.error('Error fetching events:', error);
  }
};
```

The frontend implementation is correct - it's making a GET request to the endpoint without authentication, which is appropriate since the endpoint is public.

## Fix Plan

### 1. Determine Authentication Requirements

The `/api/events/active` endpoint should remain **public** (no authentication required) because:
- It displays publicly available events
- Users should be able to browse events before logging in
- This is consistent with the current implementation

### 2. Identify the Real Issue

The 400 Bad Request error is likely caused by:
- Incorrect API URL in the frontend environment configuration
- Network connectivity issues
- Request headers or parameters that are being rejected

### 3. Implementation Steps

#### Step 1: Verify Environment Configuration
- Check that `VITE_API_BASE_URL` in `frontend/.env` points to the correct backend URL
- Ensure the backend is running and accessible at that URL

#### Step 2: Add Better Error Handling
- Enhance error logging in the backend endpoint
- Improve error messages in the frontend to provide more details

#### Step 3: Add Request Validation
- Add request validation to the backend endpoint to ensure proper parameters
- Return more descriptive error messages when validation fails

#### Step 4: Test the Fix
- Test the endpoint directly using curl or Postman
- Test through the frontend application
- Verify the fix works in both development and production environments

## Detailed Implementation

### Backend Changes

1. **Enhanced Error Handling** in `/api/events/active` endpoint:
```javascript
app.get('/api/events/active', async (req, res) => {
  try {
    // Log request details for debugging
    console.log('DEBUG: /api/events/active endpoint called');
    console.log('Request headers:', req.headers);
    console.log('Request query parameters:', req.query);
    
    // Validate query parameters if any
    // Add specific validation logic here if needed
    
    const queryText = `
      SELECT
        e.id,
        e.title,
        e.description,
        e.options,
        e.entry_fee,
        e.start_time,
        e.end_time,
        e.initial_price,
        e.final_price,
        e.status,
        e.resolution_status,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id) AS current_participants,
        COALESCE((SELECT SUM(amount) FROM participants WHERE event_id = e.id), 0) AS prize_pool
      FROM events e
      WHERE e.status = 'active' OR e.resolution_status = 'pending'`;
    
    const { rows } = await pool.query(queryText);
    const now = new Date();

    const activeEvents = rows.map(event => {
      try {
        const endTime = event.end_time ? new Date(event.end_time) : new Date();
        const startTime = event.start_time ? new Date(event.start_time) : new Date();
        
        return {
          ...event,
          end_time: endTime.toISOString(),
          start_time: startTime.toISOString(),
          time_remaining: Math.floor((endTime - now) / 1000),
          status: endTime <= now ? 'expired' : (event.status || 'active'),
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null
        };
      } catch (transformError) {
        console.error('Error transforming event data:', transformError, event);
        return {
          ...event,
          end_time: event.end_time ? new Date(event.end_time).toISOString() : new Date().toISOString(),
          start_time: event.start_time ? new Date(event.start_time).toISOString() : new Date().toISOString(),
          time_remaining: 0,
          status: event.status || 'active',
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null
        };
      }
    });

    res.json(activeEvents);
  } catch (error) {
    console.error('Error in /api/events/active endpoint:', error);
    // Return 500 with error details for better debugging
    res.status(500).json({ 
      error: 'Failed to fetch active events',
      message: error.message 
    });
  }
});
```

### Frontend Changes

1. **Enhanced Error Handling** in `fetchEvents` function:
```javascript
const fetchEvents = async () => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
    setEvents(response.data);
  } catch (error) {
    console.error('Error fetching events:', error);
    // More detailed error handling
    if (error.response) {
      // Server responded with error status
      console.error('Server error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
  }
};
```

2. **Verify Environment Configuration**:
```bash
# Check that VITE_API_BASE_URL in frontend/.env points to correct backend
VITE_API_BASE_URL=https://polycentral-production.up.railway.app
```

## Testing Plan

1. **Unit Testing**:
   - Test the `/api/events/active` endpoint with various inputs
   - Verify error handling works correctly

2. **Integration Testing**:
   - Test the complete flow from frontend to backend
   - Verify CORS is working correctly
   - Test with different browsers and devices

3. **End-to-End Testing**:
   - Test the user journey of viewing events
   - Verify the fix works in both development and production

## Rollback Plan

If the fix causes issues:
1. Revert the backend changes to the previous implementation
2. Restore the original error handling
3. Verify the application works as before

## Security Considerations

1. The `/api/events/active` endpoint should remain public as it displays non-sensitive information
2. Ensure rate limiting is in place to prevent abuse
3. Validate all inputs to prevent injection attacks

## Compatibility

1. The fix is compatible with both PostgreSQL and SQLite databases
2. The fix works with the existing deployment setup (Railway for backend, Vercel for frontend)
3. No breaking changes to the API interface

## Timeline

1. Implementation: 2-3 hours
2. Testing: 2-3 hours
3. Deployment: 1 hour
4. Total estimated time: 5-7 hours

## Success Criteria

1. The 400 Bad Request error is resolved
2. Active events are displayed correctly in the frontend
3. The fix works in both development and production environments
4. No regression issues are introduced