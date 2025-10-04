# Pot System Implementation Documentation

## Overview
This document outlines the implementation of the pot-based event entry system that replaces the previous fixed entry fee model. The new system allows users to place variable bets on events, with the total pot being distributed proportionally to winners based on their contribution.

## Database Changes

### New Columns in Events Table
- `pot_enabled` (BOOLEAN): Flag to enable pot system for an event (default: true)
- `min_bet` (INTEGER): Minimum bet amount allowed (default: 100)
- `max_bet` (INTEGER): Maximum bet amount allowed (default: 1000)

### Migration Script
The migration script `migrate_v12_to_v13.sql` adds these columns and sets appropriate constraints:

```sql
-- Add pot_enabled column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS pot_enabled BOOLEAN DEFAULT true;

-- Add min_bet and max_bet columns for pot system constraints
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS min_bet INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_bet INTEGER DEFAULT 1000;

-- Create index on pot_enabled for better query performance
CREATE INDEX IF NOT EXISTS idx_events_pot_enabled ON events(pot_enabled);

-- Add constraint to ensure min_bet <= max_bet
ALTER TABLE events 
ADD CONSTRAINT chk_min_max_bet CHECK (min_bet <= max_bet);

-- Add constraint to ensure min_bet >= 1
ALTER TABLE events 
ADD CONSTRAINT chk_min_bet_positive CHECK (min_bet >= 1);
```

## Backend API Changes

### Updated Endpoint: POST /api/events/:id/bet

#### Request
```json
{
  "prediction": "Higher",
  "entryFee": 250
}
```

#### Validation Logic
1. Verify event exists and is active
2. Check if prediction is "Higher" or "Lower"
3. Validate bet amount against event's `min_bet` and `max_bet`
4. Ensure user has sufficient points

#### Response
- Success (201): Returns the created bet record
- Error (400): Validation error with specific message
- Error (404): Event not found
- Error (500): Server error

## Frontend Changes

### PredictionSelector Component
The `PredictionSelector` component has been updated to:
1. Display minimum and maximum bet amounts based on event configuration
2. Validate user input against these limits
3. Show real-time validation messages

#### Key Changes
- Updated entry amount validation to use `event.min_bet` and `event.max_bet`
- Enhanced error messages for bet amount validation
- Input field now respects event-specific betting limits

## Event Resolution Logic

### Pot Distribution Algorithm
When an event is resolved:
1. Calculate total pot as sum of all participants' bets
2. Identify winners based on prediction outcome
3. Calculate total amount bet by winners
4. Distribute pot proportionally based on each winner's contribution

#### Example
- Total pot: 1000 points
- Winners: 3 users who bet 200, 300, and 500 points respectively
- Total winner amount: 1000 points
- Distribution:
  - User 1: (200/1000) * 1000 = 200 points
  - User 2: (300/1000) * 1000 = 300 points  
  - User 3: (500/1000) * 1000 = 500 points

## Usage Examples

### Creating an Event with Custom Betting Limits
```javascript
// Create event with custom betting limits
fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Bitcoin Price Prediction",
    description: "Predict if Bitcoin price will be higher or lower",
    options: ["Higher", "Lower"],
    min_bet: 50,
    max_bet: 500,
    start_time: "2025-10-05T00:00:00Z",
    end_time: "2025-10-06T00:00:00Z"
  })
});
```

### Placing a Bet
```javascript
// Place a bet of 250 points on an event
fetch(`/api/events/${eventId}/bet`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prediction: "Higher",
    entryFee: 250
  })
});
```

## Security Considerations
- All database operations use parameterized queries to prevent SQL injection
- User authentication is required for all betting operations
- Input validation is performed on both client and server sides
- Transaction isolation ensures data consistency during betting and resolution

## Testing
The implementation has been tested with various scenarios:
- Minimum and maximum bet validation
- Insufficient user points
- Event expiration
- Multiple winners with different bet amounts
- Edge cases with fractional point distribution