// server.js - Complete Backend Server for Predictions App
// This handles all API endpoints, database operations, and event management

const path = require('path');

// Robust production detection (Render sets RENDER=true, Railway sets RAILWAY_ENVIRONMENT_NAME=production)
const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

// Log environment information
console.log("Starting in " + (isProduction ? 'PRODUCTION' : 'development') + " mode");
console.log("Environment variables source: " + (isProduction ? '.env.production' : '.env'));

// Load environment variables
console.log('Deployment verification: 2025-10-30 12:00:00');
require('dotenv').config({
  path: path.join(__dirname, isProduction ? '.env.production' : '.env')
});

// Knex.js setup
const knex = require('knex');
const knexConfig = require('./knexfile');

let db; // This will hold the knex instance

// Log critical environment variables
console.log("Critical environment variables:");
console.log(`- RENDER: ${process.env.RENDER || 'not set'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- DB_TYPE: ${process.env.DB_TYPE || 'not set'}`);
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);

// --- Database Type Detection ---
function getDatabaseType() {
  // Check DB_TYPE environment variable
  if (process.env.DB_TYPE) {
    return process.env.DB_TYPE;
  }
  // If DATABASE_URL is set and starts with 'postgres', use PostgreSQL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    return 'postgres';
  }
  // Enforce PostgreSQL in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PostgreSQL configuration required in production');
  }
  console.warn('Using SQLite for development only');
  return 'sqlite';
}

// Now that environment variables are loaded, determine database type
const dbType = getDatabaseType();

// Continue with the rest of the setup
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// --- CORS Configuration (Dynamic & Robust) ---

// 1. Define your static, permanent domains here (Production URLs)
const whitelist = [
  'https://polyc-seven.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// 2. Define a Regex pattern for your Vercel preview URLs
// Matches: https://polyc-[ANYTHING]-tommybrahhhs-projects.vercel.app
const vercelPreviewPattern = /^https:\/\/polyc-.*-tommybrahhhs-projects\.vercel\.app$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Log the check to prove the new code is running
    console.log('🔒 CORS checking origin:', origin);

    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Check 1: Is it in the static whitelist?
    if (whitelist.includes(origin)) {
      console.log('✅ Allowed by Whitelist');
      return callback(null, true);
    }

    // Check 2: Is it a valid Vercel preview URL?
    if (vercelPreviewPattern.test(origin)) {
      console.log('✅ Allowed by Vercel Pattern');
      return callback(null, true);
    }

    // If we get here, it is BLOCKED
    console.error('⛔ BLOCKED by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true // Essential for cookies/auth
};

const {
  resolvePendingEvents,
  createInitialEvent,
  createDailyEvent,
  createDailyTournament,
  createDailyFootballEvents,
  resolveFootballMatchEvents,
  createDailySportEvent
} = require('./services/eventService');
const { initWebSocketServer, broadcastMessage } = require('./websocket/websocketServer');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8080;

// Enable CORS with specific options
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// Import middleware
const { authenticateAdmin } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const loggingMiddleware = require('./middleware/loggingMiddleware');
const jsonMiddleware = require('./middleware/jsonMiddleware');
const dbMiddleware = require('./middleware/dbMiddleware');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');



// --- Database Setup ---
const fs = require('fs');

// Initialize Knex based on environment
if (isProduction) {
  db = knex(knexConfig.production);
  console.log('💾 Initialized Knex for PRODUCTION (PostgreSQL)');
} else {
  // For development, use DB_CLIENT env var or default to sqlite3
  const client = process.env.DB_CLIENT || 'sqlite3';
  if (client === 'pg') {
    db = knex(knexConfig.development);
    console.log('💾 Initialized Knex for DEVELOPMENT (PostgreSQL)');
  } else {
    // Ensure SQLite database file exists for development
    const sqliteDbPath = path.join(__dirname, 'database.sqlite');
    if (!fs.existsSync(sqliteDbPath)) {
      fs.writeFileSync(sqliteDbPath, ''); // Create empty file if it doesn't exist
    }
    db = knex({
      ...knexConfig.development,
      connection: { filename: sqliteDbPath }
    });
    console.log('💾 Initialized Knex for DEVELOPMENT (SQLite)');
  }
}

// Attach knex to the global object for easier access in other modules if needed
// global.db = db;

// Test database connection
db.raw('SELECT 1')
  .then(() => console.log("Database connection successful"))
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

// --- Database Initialization ---
async function initializeDatabase() {
  try {
    console.log(`🛠️ Running database migrations...`);
    await db.migrate.latest({
      directory: path.join(__dirname, 'migrations')
    });
    console.log('✅ Database migrations complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

// REMOVED createSampleEvents function entirely - not needed in production

// REMOVED createTestUsers function entirely - not needed in production

// Import route modules
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');

const leaderboardRoutes = require('./routes/leaderboardRoutes');

// --- API Routes, Cron Job, and Server Startup ---

// Middleware to make database connection available to all routes
app.use(dbMiddleware(db));

// Register route modules
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaderboard', leaderboardRoutes);

// Add monitoring variables as globals for admin controller access
global.lastEventCreationAttempt = null;
global.lastEventCreationSuccess = null;

// Schedule cron jobs
cron.schedule('0 0 * * *', () => {
  console.log('Cron job triggered: createDailyEvent');
  createDailyEvent(db);
}); // Run daily at midnight UTC
cron.schedule('0 1 * * *', () => createDailyTournament(db)); // Run daily at 1 AM UTC
cron.schedule('0 2 * * *', () => createDailyFootballEvents(db)); // Run daily at 2 AM UTC
cron.schedule('0 3 * * *', () => createDailySportEvent(db)); // Run daily at 3 AM UTC
cron.schedule('0 * * * *', () => resolvePendingEvents(db)); // Run hourly at minute 0
cron.schedule('30 * * * *', () => resolveFootballMatchEvents(db)); // Run hourly at minute 30

async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    // Test database connection
    await db.raw('SELECT 1');
    console.log("Database connection successful");
    
    // Try to start the server on the specified port or an alternative port
    const server = await startServerOnAvailablePort();
    
    

    // Create initial event after server has started
    await createInitialEvent(db);
    
    // Add additional error logging
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Application specific logging, throwing an error, or other logic here
    });
    
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // Application specific logging, throwing an error, or other logic here
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function startServerOnAvailablePort() {
  const portsToTry = [PORT, 8000, 5000, 3000];
  
  for (const port of portsToTry) {
    console.log(`Trying to start server on port ${port}...`);
    try {
      // Try to start server on the specified port
      const server = app.listen(port, '0.0.0.0', () => {
        console.log("\nServer listening on port " + port);
        console.log("Environment variables:", {
          PORT: port,
          NODE_ENV: process.env.NODE_ENV,
          RENDER: process.env.RENDER,
          DB_TYPE: process.env.DB_TYPE,
          DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
        });
        console.log("Server started successfully");
        
        // Initialize WebSocket server after HTTP server starts
        initWebSocketServer(server);
      });
      
      // Wait a short time to see if the server starts successfully
      await new Promise((resolve, reject) => {
        server.on('listening', () => {
          resolve(server);
        });
        
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log("Port " + port + " is already in use.");
            reject(error);
          } else {
            reject(error);
          }
        });
        
        // Timeout after 1 second
        setTimeout(() => {
          reject(new Error('Server start timeout'));
        }, 1000);
      });
      
      // If we get here, the server started successfully
      return server;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log("Port " + port + " is already in use. Trying next port...");
        continue;
      } else {
        throw error;
      }
    }
  }
  
  // If all ports are in use, throw an error
  throw new Error('All ports are in use');
}

startServer();

app.use(errorHandler);

app.use(notFoundMiddleware);

process.on('SIGINT', () => {
    console.log("\nShutting down server...");
    db.destroy(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
    });
});