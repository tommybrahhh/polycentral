# Pot Split Functionality Fixes

## Issues Identified in resolvePendingEvents Function

After analyzing the `resolvePendingEvents` function in `backend/server.js`, I've identified several critical issues that prevent the pot split functionality from working correctly:

### 1. Undefined Variable: `totalPot`
- **Location**: Lines 771, 772, 780, 849, 857
- **Issue**: The code references `totalPot` but this variable is never defined
- **Fix**: Replace all instances of `totalPot` with `potData.total_pot` (the correct variable that holds the total pot value)

### 2. Undefined Variable: `client`
- **Location**: Lines 775, 797
- **Issue**: The code uses `client.query()` but `client` is never defined in this scope
- **Fix**: Replace these instances with `pool.query()` since we're not in a transaction context here

### 3. Undefined Variable: `participants`
- **Location**: Line 847
- **Issue**: The code references `participants.rows.length` but `participants` is never defined
- **Fix**: Define `participants` by querying the participants table before the audit log entry

### 4. Incorrect Variable Declaration
- **Location**: Line 801
- **Issue**: A new `client` variable is declared inside a loop iteration, but it's used for database operations that should be outside that scope
- **Fix**: Move the client connection outside the loop or restructure the code to properly handle database connections

## Detailed Fixes

### Fix 1: Replace `totalPot` with `potData.total_pot`

```javascript
// Line 771 - Before:
const platformFee = Math.floor(totalPot * 0.05);

// Line 771 - After:
const platformFee = Math.floor(potData.total_pot * 0.05);
```

```javascript
// Line 772 - Before:
const remainingPot = totalPot - platformFee;

// Line 772 - After:
const remainingPot = potData.total_pot - platformFee;
```

```javascript
// Line 780 - Before:
if (totalPot > 0) {

// Line 780 - After:
if (potData.total_pot > 0) {
```

```javascript
// Line 849 - Before:
totalPot: totalPot,

// Line 849 - After:
totalPot: potData.total_pot,
```

```javascript
// Line 857 - Before:
console.log(`Distributed ${totalPot} points to ${winners.length} winners for event ${event.id}`);

// Line 857 - After:
console.log(`Distributed ${potData.total_pot} points to ${winners.length} winners for event ${event.id}`);
```

### Fix 2: Replace `client` with `pool`

```javascript
// Line 775 - Before:
await client.query(
  'UPDATE events SET platform_fee = platform_fee + $1 WHERE id = $2',
  [platformFee, event.id]
);

// Line 775 - After:
await pool.query(
  'UPDATE events SET platform_fee = platform_fee + $1 WHERE id = $2',
  [platformFee, event.id]
);
```

```javascript
// Line 797 - Before:
await client.query(
  'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES ($1, $2, $3)',
  [event.id, winner.id, Math.floor(winner.amount * 0.05)]
);

// Line 797 - After:
await pool.query(
  'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES ($1, $2, $3)',
  [event.id, winner.id, Math.floor(winner.amount * 0.05)]
);
```

### Fix 3: Define `participants` variable

Add this code before line 843 (before the audit log entry):

```javascript
// Get all participants for audit log
const participants = await pool.query(
  'SELECT * FROM participants WHERE event_id = $1',
  [event.id]
);
```

### Fix 4: Restructure client connection

The client connection on line 801 should be moved outside the winners loop or properly handled within each iteration.

## Summary

These fixes will ensure that:
1. Winners receive their correct share of the pot
2. Points are properly recorded in the database
3. The user history API endpoint can retrieve the points_awarded data
4. The frontend ProfileHistory component can display the points correctly