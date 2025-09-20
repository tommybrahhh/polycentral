# polycentral-backend

## Environment Setup
1. Create `.env` file in backend directory using the example:
   ```bash
   cp .env.example .env
   ```
2. Fill in required environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `COINGECKO_API_KEY`: Your CoinGecko API key
   - `PORT`: Server port (default: 3001)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Initialize database:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

## Cron Job Schedules
- **Event Resolution**: Runs every 30 minutes to check for expired events
  - Checks for expired events
  - Resolves predictions using CoinGecko API
  - Processes payouts

## Event Lifecycle
1. **Prediction Submission**: Users submit predictions before event lock
2. **Event Lock**: Event locks at specified end time
3. **Resolution**:
   - System fetches final price from CoinGecko API
   - Compares predictions to actual price
   - Determines winners
4. **Payout**: Winners receive rewards automatically

## CoinGecko API Reference
We use CoinGecko API for cryptocurrency price data:
- **Endpoint**: `/simple/price`
- **Parameters**: 
  - `ids`: bitcoin
  - `vs_currencies`: usd
- **Data Retrieved**: Current BTC/USD price
- **Authentication**: API key required (stored in environment variables)
- **Rate Limiting**: Exponential backoff implemented (1000ms initial delay, 5 max retries)