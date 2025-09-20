## Render Deployment Guide

### Credential Management Best Practices

1. **Never commit credentials**: Environment variables containing secrets must be stored in Render's environment variables section, not in code
2. **Rotation procedure**:
   - Rotate credentials via Render dashboard
   - Update environment variables immediately
   - Restart affected services
3. **Local development**:
   - Use `.env` file (gitignored)
   - Create from `.env.example` template
4. **Pre-commit security scan**:
   ```bash
   npx gitguardian scan
   ```
5. **Auditing exposed credentials**:
   ```powershell
   ./clean-history.ps1
   ```

### Deployment Steps
1. Connect your GitHub repository
2. Set required environment variables in Render dashboard:
   ```env
   # Required core variables
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-64-char-hex>
   JWT_REFRESH_SECRET=<different-64-char-hex>
   BCRYPT_SALT_ROUNDS=12
   FRONTEND_URL=https://your-frontend-domain.com
   CORS_ORIGIN=https://your-frontend-domain.com
   DB_TYPE=postgres
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   LOG_LEVEL=info
   
   # Event feature variables (if used)
   COINGECKO_API_KEY=your_api_key
   ADMIN_API_KEY=your_secure_key
   ```
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Enable auto-deploy on push

### Event Feature Setup

- **Database requirements**:
  Ensure PostgreSQL has latest schema from `sql/postgres/init_tables.sql`

### Automated Resolution

- Scheduled job runs every 30 minutes to resolve expired events
- Verify in logs: `"Checking for unresolved events..."`
- To test manually: `POST /api/events/resolve` with Admin API key

### Troubleshooting

- If resolution fails, check logs for Coingecko API errors
- Ensure server timezone is UTC
<!-- Deployment trigger commit - $(date) -->