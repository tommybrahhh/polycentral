# Fix for "column 'total_bets' does not exist" Error

## Problem Description
The application was throwing a 500 error when users tried to place bets with the following error message:
```
❌ Bet placement error: error: column "total_bets" does not exist
```

## Root Cause
The `total_bets` column was missing from the `events` table in the database. This column is used to track the total number of bets placed on each event.

## Solution Implemented

### 1. Database Migration
Created new migration files to add the missing `total_bets` column:

**PostgreSQL Migration (`backend/sql/postgres/migrate_v10_to_v11.sql`):**
```sql
-- Migration v10 to v11: Add missing total_bets column to events table
DO $$
BEGIN
    -- Check if total_bets column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'total_bets'
    ) THEN
        -- Add the missing total_bets column
        ALTER TABLE events ADD COLUMN total_bets INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
```

**SQLite Migration (`backend/sql/sqlite/migrate_v10_to_v11.sql`):**
```sql
-- Migration v10 to v11: Add missing total_bets column to events table
-- SQLite doesn't support DO blocks, so we rely on the application's ensureEventsTableIntegrity function
SELECT 'Migration handled by application ensureEventsTableIntegrity function' as migration_status;
```

### 2. Application-Level Fix
Enhanced the `ensureEventsTableIntegrity` function in `backend/server.js` to check for and add the `total_bets` column if it's missing:

```javascript
// Check and fix total_bets column
if (!hasTotalBets) {
  const addTotalBetsQuery = dbType === 'postgres'
    ? 'ALTER TABLE events ADD COLUMN IF NOT EXISTS total_bets INTEGER NOT NULL DEFAULT 0'
    : 'ALTER TABLE events ADD COLUMN total_bets INTEGER NOT NULL DEFAULT 0';
  
  await pool.query(addTotalBetsQuery);
  console.log('✅ Added total_bets column to events table');
}
```

### 3. Frontend Updates
Updated the frontend to properly handle entry fees:

1. Changed the default entry fee in the event creation form from 250 to 0
2. Updated the event creation logic to use the configured entry fee or default to 0
3. Ensured that the entry fee and prize pool are properly displayed in the UI

## Verification
After implementing these changes:

1. The database migration successfully adds the `total_bets` column to the `events` table
2. The application-level integrity check ensures the column exists
3. Users can place bets without encountering the 500 error
4. The entry fee and prize pool are properly displayed in the frontend

## Files Modified
1. `backend/sql/postgres/migrate_v10_to_v11.sql` - New PostgreSQL migration
2. `backend/sql/sqlite/migrate_v10_to_v11.sql` - New SQLite migration
3. `backend/server.js` - Enhanced table integrity check
4. `frontend/src/App.jsx` - Updated default entry fee
5. `docs/DATABASE-MIGRATIONS.md` - Updated documentation
6. `docs/POST-BET-500-ERROR-FIX.md` - This document

## Testing
To verify the fix:

1. Create a new event with a custom entry fee
2. Place a bet on the event
3. Verify that the bet is placed successfully without errors
4. Check that the entry fee and prize pool are displayed correctly in the UI

The fix ensures that both new and existing deployments will have the required `total_bets` column, preventing the error from occurring.