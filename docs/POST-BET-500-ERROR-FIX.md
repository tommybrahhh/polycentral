# 500 Internal Server Error Fix for POST /api/events/:id/bet Endpoint

## Issue Description
The POST /api/events/:id/bet endpoint was returning a 500 Internal Server Error when users attempted to place bets on events. This error was occurring in the backend server and preventing users from participating in prediction events.

## Root Cause Analysis
After thorough investigation, the issue was found to be related to database schema inconsistencies, specifically with the `amount` column in the `participants` table. The route implementation assumed that the `amount` column exists in the table, but there were cases where:
- The column didn't exist due to a failed migration
- The column exists but with a different name (e.g., `points_paid`)
- The database schema was not properly initialized

## Changes Made

### 1. Database Schema Validation
- Added diagnostic logging to help identify the exact point of failure
- Added a schema check to verify the `amount` column exists in the `participants` table before attempting to insert data
- Added proper error handling for both PostgreSQL and SQLite databases
- Added rollback functionality if the schema check fails

### 2. Enhanced Error Handling
- Improved error handling in the bet placement route with more detailed logging
- Added specific error responses for different failure scenarios
- Added transaction rollback mechanism to ensure data consistency

### 3. Code Changes
The specific changes were made to the `app.post('/api/events/:id/bet', authenticateToken, ...)` route in `backend/server.js`:
- Added a pre-flight check to verify the `amount` column exists in the `participants` table
- Added detailed error logging for debugging purposes
1. Added a pre-flight check to verify the `amount` column exists in the `participants` table:
   - For PostgreSQL: Query `information_schema.columns` to check for the `amount` column
   - For SQLite: Use `PRAGMA table_info(participants)` to check for the `amount` column
   - Return a 500 error with a descriptive message if the column is missing
   - Added error handling for the schema check itself

2. Enhanced transaction handling to ensure proper rollback on errors:
   - Added detailed error logging for debugging purposes
   - Ensured the transaction is properly rolled back when errors occur
   - Added proper error responses to the client

## Troubleshooting Similar Issues
If you encounter similar 500 Internal Server Errors in the future, follow these steps:

1. Check the server logs for detailed error messages
2. Verify that all required database columns exist in the relevant tables
3. Ensure the database schema is properly initialized and up to date
4. Check for any recent code changes that might have introduced the issue
5. Test the affected functionality with different inputs to isolate the problem
6. Verify database connectivity and permissions
7. Check for any missing environment variables or incorrect configuration values

## Testing
The fix was tested by:
1. Verifying the `amount` column exists in the `participants` table
2. Testing the bet placement functionality with valid data
3. Verifying proper error handling when the column is missing
4. Testing both PostgreSQL and SQLite database implementations

## Deployment Instructions
1. Deploy the updated `backend/server.js` file
2. Ensure the database initialization process runs properly
3. Monitor the logs for any errors during the bet placement process

## Monitoring
- Check the server logs for any 500 errors related to the bet placement endpoint
- Monitor user feedback for any issues with placing bets
- Verify that the database schema is correctly set up in all environments

## Future Improvements
- Add more comprehensive unit tests for the bet placement functionality
- Implement a more robust error reporting system
- Add metrics tracking for bet placement success/failure rates
- Create automated checks to verify database schema integrity during application startup