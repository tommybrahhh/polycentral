# Deployment Instructions for Fix: 400 Bad Request Error on /api/events/active Endpoint

## Overview
This document provides detailed deployment instructions for deploying the fix that resolves the 400 Bad Request error when fetching active events from the `/api/events/active` endpoint. The fix enhances error handling and request validation without changing authentication requirements.

## Prerequisites
- Git installed on your development machine
- Node.js (v16 or higher) and npm installed
- Access to the GitHub repository
- Access to the Railway deployment platform
- Access to the Vercel deployment platform (for frontend)

## Changes Included in This Fix
1. Enhanced error handling in the `/api/events/active` endpoint
2. Improved request validation and logging
3. Better data transformation with error handling
4. No database schema changes required
5. No authentication changes required

## Deployment Steps

### 1. Git Commands for Committing and Pushing Changes

```bash
# Ensure you're on the main branch and it's up to date
git checkout main
git pull origin main

# Add and commit the changes
git add backend/server.js
git commit -m "Fix: Enhanced error handling and validation for /api/events/active endpoint"

# Push the changes to GitHub
git push origin main
```

### 2. Package Updates or Installations

No new packages are required for this fix. All dependencies are already included in the project.

If you need to update dependencies, run:
```bash
cd backend
npm install
```

### 3. Environment Variable Updates or Checks

No new environment variables are required for this fix. However, verify that the following variables are correctly set:

#### Backend Environment Variables (backend/.env.production)
```env
NODE_ENV=production
PORT=8080
JWT_SECRET=<your-jwt-secret>
ADMIN_API_KEY=<your-admin-api-key>
COINGECKO_API_KEY=CG-dzCqFQBvWE5iKBYBLH8xSnPz
CRYPTO_ID=bitcoin
DEFAULT_CRYPTO_SYMBOL=btc
CORS_ORIGIN=https://polyc-seven.vercel.app,http://localhost:5173
DB_TYPE=postgres
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
```

#### Frontend Environment Variables (frontend/.env)
```env
VITE_API_BASE_URL=https://polycentral-production.up.railway.app
```

### 4. Database Migration Steps

No database migrations are required for this fix. The fix only enhances the error handling and validation logic in the backend endpoint.

### 5. Deploying to Railway

#### Manual Deployment via Railway CLI
1. Install the Railway CLI if you haven't already:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Deploy the application:
   ```bash
   railway up
   ```

#### Deployment via GitHub Integration (Recommended)
1. Ensure your GitHub repository is connected to Railway
2. Railway will automatically deploy when changes are pushed to the main branch
3. Monitor the deployment process in the Railway dashboard

### 6. Verification Steps

#### After Deployment
1. Check the Railway logs to ensure the application starts without errors
2. Verify the backend is accessible:
   ```bash
   curl https://polycentral-production.up.railway.app/api/health
   ```

3. Test the `/api/events/active` endpoint:
   ```bash
   curl https://polycentral-production.up.railway.app/api/events/active
   ```

4. Verify the frontend can access the endpoint:
   - Visit the frontend application
   - Check that the events list loads correctly
   - Open browser developer tools to verify no errors in the console

#### Detailed Testing
1. Test the endpoint with various parameters
2. Test the endpoint with invalid parameters
3. Verify error handling works correctly
4. Check that the response format is consistent
5. Test the endpoint performance

### 7. Security Considerations

1. The `/api/events/active` endpoint remains public (no authentication required)
2. Rate limiting is in place to prevent abuse
3. Input validation is implemented to prevent injection attacks
4. Error messages are not overly detailed to prevent information leakage

### 8. Rollback Procedures

If issues are discovered after deployment, you can rollback using one of these methods:

#### Method 1: Revert Git Commit
```bash
# Revert the last commit
git revert HEAD
git push origin main
```

#### Method 2: Deploy Previous Version
```bash
# Checkout the previous working version
git checkout <previous-commit-hash>
git push origin main
```

#### Method 3: Railway Rollback
1. Go to the Railway dashboard
2. Navigate to the deployment history
3. Select the previous working deployment
4. Click "Rollback"

### 9. Monitoring After Deployment

1. Monitor Railway logs for any errors
2. Check application performance
3. Monitor API response times
4. Verify that the frontend is working correctly
5. Check for any unexpected errors in the browser console

### 10. Troubleshooting

#### Common Issues
1. **CORS Errors**: 
   - Verify `CORS_ORIGIN` in environment variables matches the frontend URL
   - Check that the frontend is making requests to the correct backend URL

2. **Database Connection Issues**:
   - Check `DATABASE_URL` format and credentials
   - Verify database connectivity from the Railway environment

3. **Environment Variables**:
   - Ensure all required variables are set in production
   - Check for any missing or incorrect values

#### Debugging Steps
1. Check Railway logs for detailed error messages
2. Test the endpoint directly with curl or Postman
3. Verify the database connection is working
4. Check that all environment variables are correctly set

## Success Criteria
1. The 400 Bad Request error is resolved when fetching active events
2. Active events are displayed correctly in the frontend
3. The fix works in the production environment
4. No regression issues are introduced
5. Performance is maintained or improved
6. Error handling is enhanced without exposing sensitive information

## Additional Notes
1. The fix is backward compatible and does not require any frontend changes
2. The deployment should be seamless with no downtime
3. Monitor the application for the first 24 hours after deployment
4. Ensure the team is notified of the successful deployment