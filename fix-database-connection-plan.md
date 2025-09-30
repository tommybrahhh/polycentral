# Fix Database Connection Issue in Railway Deployment

## Problem Summary
The database migrations are failing during the Docker build process on Railway with the error:
```
AssertionError [ERR_ASSERTION]: ifError got unwanted exception: getaddrinfo ENOTFOUND postgres.railway.internal
```

This happens because the database connection is being attempted during the Docker build process, but the database service is not available at that time.

## Root Cause Analysis
1. The Dockerfile contains a line that runs database migrations during the build process:
   ```dockerfile
   RUN npm run migrate --if-present
   ```

2. The `npm run migrate` command uses the db-migrate tool which reads the database configuration from `database.json`.

3. The `database.json` file has hardcoded values for the database connection:
   ```json
   {
     "prod": {
       "driver": "pg",
       "user": "postgres",
       "password": "MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd",
       "host": "postgres.railway.internal",
       "database": "railway",
       "port": 5432
     }
   }
   ```

4. The hostname `postgres.railway.internal` is only available when the application is running in the Railway environment, not during the build process.

## Solution Overview
The solution involves two main changes:
1. Remove the database migration step from the Docker build process
2. Update the database configuration to use the correct connection parameters

## Detailed Changes

### 1. Update Dockerfile
Remove the line that runs database migrations during the build process:
```dockerfile
# Remove this line:
# RUN npm run migrate --if-present
```

The migrations will be run when the application starts, which is the correct time to run them.

### 2. Update database.json
Update the database configuration to match the actual database connection parameters:
```json
{
  "prod": {
    "driver": "pg",
    "user": "postgres",
    "password": "MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd",
    "host": "metro.proxy.rlwy.net",
    "database": "railway",
    "port": 56048
  }
}
```

These values match the DATABASE_URL environment variable:
```
DATABASE_URL=postgresql://postgres:MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd@metro.proxy.rlwy.net:56048/railway
```

### 3. Application Code Review
The application code is already well-structured with proper error handling for database connections. The PostgreSQL connection setup in `server.js` (lines 94-111) includes:
- Connection using the DATABASE_URL environment variable
- Error handling for connection issues
- Fallback connection logic

No changes are needed to the application code.

## Implementation Steps
1. Update the Dockerfile to remove the database migration step during build
2. Update the database.json file with the correct database connection parameters
3. Test the changes locally
4. Deploy the changes to Railway
5. Verify the deployment is successful

## Testing Plan
1. Build the Docker image locally to ensure it builds without errors
2. Run the application locally to ensure it can connect to the database
3. Test the database migrations by running them manually
4. Verify all application functionality works correctly

## Deployment Plan
1. Commit the changes to the repository
2. Push the changes to trigger a new deployment on Railway
3. Monitor the deployment logs to ensure the build succeeds
4. Verify the application is running correctly after deployment

## Rollback Plan
If the deployment fails:
1. Revert the Dockerfile changes
2. Revert the database.json changes
3. Deploy the previous version
4. Investigate the issue further