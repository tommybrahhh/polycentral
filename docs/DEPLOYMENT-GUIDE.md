# Polycentral Deployment Guide

This document provides complete context and instructions for deploying and maintaining the Polycentral application.

## Repository Structure
- Main repository: https://github.com/tommybrahhh/polycentral
- Frontend: `/frontend` directory
- Backend: `/backend` directory
- Database: PostgreSQL on Railway

## Deployment Architecture
```
Frontend (Vercel) → Backend (Railway) → Database (Railway PostgreSQL)
       ↑                                  ↓
  Users (Browser)                   CoinGecko API
```

## Frontend Deployment (Vercel)
1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import repository: `tommybrahhh/polycentral`
4. Configure settings:
   - Framework: Auto-detected (Vite/React)
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://polycentral-production.up.railway.app` (your Railway backend URL)
6. Click "Deploy"

Frontend URL: https://polyc-seven.vercel.app

## Backend Deployment (Railway)
1. Go to https://railway.app and sign in
2. Click "New Project" and select "Deploy from GitHub"
3. Connect repository: `tommybrahhh/polycentral`
4. Configure settings:
   - Name: `polycentral-production`
   - Branch: `master`
   - Root Directory: `backend`
   - Runtime: `Node.js`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. The `railway.json` file will automatically configure environment variables

## Environment Variables
The following environment variables are required:

| Variable | Value | Purpose |
|---------|-------|--------|
| `NODE_ENV` | `production` | Sets application environment |
| `PORT` | `8080` | Port for the Node.js server |
| `DATABASE_URL` | `postgresql://postgres:MBeAkwZQLdPGhXzUTcclEYNFufdwcnnd@metro.proxy.rlwy.net:56048/railway` | PostgreSQL connection string |
| `JWT_SECRET` | [Auto-generated] | Secret key for JWT authentication |
| `ADMIN_API_KEY` | [Auto-generated] | API key for admin endpoints |
| `COINGECKO_API_KEY` | `CG-dzCqFQBvWE5iKBYBLH8xSnPz` | CoinGecko API key for price data |
| `CRYPTO_ID` | `bitcoin` | Cryptocurrency to track for predictions |
| `DEFAULT_CRYPTO_SYMBOL` | `btc` | Symbol for the tracked cryptocurrency |
| `CORS_ORIGIN` | `https://polyc-seven.vercel.app` | Frontend URL for CORS policy |

## Key Functionality
### Event Management
- **Event Creation**: Uses CoinGecko API to get current Bitcoin price
- **Event Resolution**: Uses CoinGecko API to get historical price at event end time
- **API Endpoints**: 
  - `POST /api/events` - Create new event
  - `GET /api/events/active` - Get active events
  - `POST /api/events/:id/bet` - Place a prediction

### Authentication
- JWT-based authentication for user sessions
- Admin API key for protected endpoints
- Secure password hashing with bcrypt

## Maintenance
### Database Migrations
Database schema changes are managed through migration files in:
- `backend/sql/postgres/migrate_v*.sql`

### Cron Jobs
The backend includes scheduled jobs for:
- Daily event creation (runs at 00:00 UTC)
- Event resolution (runs every 30 minutes)

### Error Handling
- Comprehensive error logging
- Graceful shutdown with database connection cleanup
- Rate limiting to prevent abuse

## Troubleshooting
### Common Issues
1. **CORS Errors**: Verify `CORS_ORIGIN` matches your frontend URL
2. **Database Connection**: Check `DATABASE_URL` format and credentials
3. **API Rate Limits**: CoinGecko API has rate limits; implement caching if needed
4. **Environment Variables**: Ensure all required variables are set in production

### Monitoring
- Check Render dashboard for service logs
- Monitor Vercel deployment logs for frontend issues
- Use database connection pooling for performance

## Future Improvements
- Add caching for CoinGecko API responses
- Implement WebSocket for real-time updates
- Add admin dashboard for event management
- Implement user verification system