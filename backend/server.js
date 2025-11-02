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
const WebSocket = require('ws');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const coingecko = require('./lib/coingecko');
const { updateUserPoints } = require('./utils/pointsUtils');
const { generateVerificationToken, getExpirationTime, sendVerificationEmail } = require('./utils/emailUtils');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8080;

// Middleware to authenticate admin using database is_admin flag
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify JWT token to get user ID
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                console.log('Token verification failed:', err.message);
                return res.status(401).json({ error: 'Token is invalid or expired' });
            }

            const userId = decoded.userId;
            
            // Check if user is admin directly from database
            const { rows } = await db.raw('SELECT is_admin FROM users WHERE id = ?', [userId]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (!rows[0].is_admin) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            req.userId = userId;
            next();
        });
    } catch (error) {
        console.error('Admin authentication error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

// Create admin router and apply middleware
const adminRouter = express.Router();
adminRouter.use(authenticateAdmin);

// --- Middleware Setup ---
app.use(helmet());
// Set allowed origins for CORS
const raw = process.env.CORS_ORIGIN || 'https://polycentral-production.up.railway.app,https://polyc-seven.vercel.app,http://localhost:5173,https://polyc-hxdso9cwj-tommybrahhhs-projects.vercel.app,https://polyc-7dzllhjyy-tommybrahhhs-projects.vercel.app';
const allowedOrigins = raw.split(',').map(o => o.trim()).filter(Boolean);

console.log('✅ CORS allowed origins configured:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Log the incoming origin for debugging
        console.log('CORS check: Incoming request origin:', origin);

        // Allow requests with no origin (like mobile apps or curl requests)
        // or if the origin is in our allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error('❌ CORS Error: Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200 // For legacy browser support
}));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip} - Headers: ${JSON.stringify(req.headers)}`);
    });
    next();
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Mount admin router
app.use('/api/admin', adminRouter);

// --- Database Setup ---
const fs = require('fs').promises;

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
    await db.migrate.latest(knexConfig);
    console.log('✅ Database migrations complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

// REMOVED createSampleEvents function entirely - not needed in production

// REMOVED createTestUsers function entirely - not needed in production

// --- Event Resolution Job ---
// --- Event Creation Job ---
// --- Event Creation Functions ---
async function createEvent(initialPrice) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const entryFee = 100;
  console.log('Creating event with entry fee:', entryFee, 'and initial price:', initialPrice);

  // Generate formatted title with closing price question and creation price
  const eventDate = new Date().toISOString().split('T')[0];
  const title = `Closing price of Bitcoin on ${eventDate}`;
  
  // Create simplified Higher/Lower options
  const options = [
    { id: 'higher', label: 'Higher', value: 'Higher' },
    { id: 'lower', label: 'Lower', value: 'Lower' }
  ];
  
  // Look up event type 'prediction'
  const typeQuery = await db.raw(`SELECT id FROM event_types WHERE name = 'prediction'`);
  if (typeQuery.rows.length === 0) {
    throw new Error("Event type 'prediction' not found");
  }
  const eventTypeId = typeQuery.rows[0].id;

  await db.raw(
    `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time, location, event_type_id, status, resolution_status, entry_fee, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'pending', ?, ?)`,
    [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime, 'Global', eventTypeId, entryFee, JSON.stringify(options)]
  );
}

// --- Event Resolution Job ---
async function resolvePendingEvents() {
  try {
    console.log('🔍 Resolving pending events...');
    const now = new Date();
    console.log(`🔍 Resolution timestamp: ${now.toISOString()}`);
    
    // Find events ready for resolution
    const { rows: events } = await db.raw(
      `SELECT id, end_time, initial_price FROM events
       WHERE end_time < ? AND resolution_status = 'pending'`,
      [now]
    );

    if (events.length === 0) {
      console.log('🔍 No pending events to resolve');
      return;
    }

    console.log(`🔍 Found ${events.length} events to resolve`);
    console.log(`🔍 Events to resolve: ${events.map(e => e.id).join(', ')}`);
    
    for (const event of events) {
      try {
        console.log(`🔍 Resolving event ${event.id}...`);
        console.log(`🔍 Event ${event.id} initial price: $${event.initial_price}`);
        console.log(`🔍 Event ${event.id} end time: ${event.end_time}`);
        
        const finalPrice = await coingecko.getHistoricalPrice(process.env.CRYPTO_ID || 'bitcoin', event.end_time);
        console.log(`🔍 Event ${event.id} final price from CoinGecko: $${finalPrice}`);
        
        // Update event with final price
        await db.raw(
          `UPDATE events
           SET final_price = ?, resolution_status = 'resolved'
           WHERE id = ?`,
          [finalPrice, event.id]
        );
        
        console.log(`🔍 Resolved event ${event.id} with final price: $${finalPrice}`);
        
        // Determine outcome based on Higher/Lower
        let correctAnswer;
        const initialPrice = parseFloat(event.initial_price.toFixed(2));
        const finalPriceRounded = parseFloat(finalPrice.toFixed(2));

        if (finalPriceRounded > initialPrice) {
          correctAnswer = 'Higher';
        } else if (finalPriceRounded < initialPrice) {
          correctAnswer = 'Lower';
        } else {
          // Edge case: If prices are exactly equal after rounding, we must have a winner.
          // Per your instruction, we'll arbitrarily pick one. Let's make it 'Higher' for consistency.
          // This can be changed to 'Lower' if preferred, or a refund logic could be implemented here in the future.
          correctAnswer = 'Higher';
        }
        console.log(`🔍 Event ${event.id} correct answer: ${correctAnswer}`);
        
        // Update event with correct answer
        await db.raw(
          `UPDATE events
           SET correct_answer = ?
           WHERE id = ?`,
          [correctAnswer, event.id]
        );
        
        // Calculate total pot from all participants
        console.log(`🔍 Calculating total pot for event ${event.id}...`);
        const { rows: [potData] } = await db.raw(
          `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = ?`,
          [event.id]
        );
        console.log(`🔍 Event ${event.id} total pot: ${potData.total_pot}`);
        
        // Calculate platform fee (5%) and remaining pot
        const platformFee = Math.floor(potData.total_pot * 0.05);
        const remainingPot = potData.total_pot - platformFee;
        console.log(`🔍 Event ${event.id} platform fee (5%): ${platformFee}`);
        console.log(`🔍 Event ${event.id} remaining pot after fee: ${remainingPot}`);
        
        // Update event with platform fee
        console.log(`🔍 Updating event ${event.id} with platform fee...`);
        await db.raw(
          'UPDATE events SET platform_fee = platform_fee + ? WHERE id = ?',
          [platformFee, event.id]
        );
        console.log(`🔍 Event ${event.id} platform fee updated successfully`);
        
        if (potData.total_pot > 0) {
          // Get all winners with their bet amounts and participant IDs
          const { rows: winners } = await db.raw(
            `SELECT id, user_id, amount FROM participants WHERE event_id = ? AND prediction = ?`,
            [event.id, correctAnswer]
          );
          
          if (winners.length > 0) {
            // Calculate total amount bet by winners
            console.log(`🔍 Event ${event.id} calculating total amount bet by winners...`);
            const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);
            console.log(`🔍 Event ${event.id} total amount bet by winners: ${totalWinnerAmount}`);
            
            // Award proportional share of pot to each winner
            // Record winner outcomes and distribute points
            for (const winner of winners) {
              console.log(`🔍 Calculating share for winner ${winner.user_id} (participant ${winner.id})...`);
              console.log(`🔍 Winner ${winner.user_id} bet amount: ${winner.amount}`);
              const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * remainingPot);
              console.log(`🔍 Winner ${winner.user_id} share: ${winnerShare}`);
              
              // Record fee contribution for this participant
              const winnerFee = Math.floor(winner.amount * 0.05);
              console.log(`🔍 Recording platform fee for winner ${winner.user_id}: ${winnerFee}`);
              await db.raw(
                'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES (?, ?, ?)',
                [event.id, winner.id, winnerFee]
              );
              
              
              // Use a transaction for each winner to ensure consistency
              const trx = await db.transaction();
              try {
                console.log(`🔍 Distributing points to winner ${winner.user_id}...`);
                
                // Update user points using centralized function
                console.log(`🔍 Adding ${winnerShare} points to user ${winner.user_id}`);
                const newBalance = await updateUserPoints(trx, winner.user_id, winnerShare, 'event_win', event.id);
                
                // Record winning outcome
                console.log(`🔍 Recording winning outcome for participant ${winner.id}`);
                await trx.raw(
                  `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                   VALUES (?, 'win', ?)`,
                  [winner.id, winnerShare]
                );
                
                // Add diagnostic logging
                console.log(`🔍 Inserted event_outcome for winner: participant_id=${winner.id}, result=win, points_awarded=${winnerShare}`);
                
                await trx.commit();
                console.log(`🔍 Transaction committed for winner ${winner.user_id}`);
              } catch (error) {
                await trx.rollback();
                console.log(`❌ Transaction rolled back for winner ${winner.user_id} due to error:`, error);
                // Continue with other winners even if one fails
                continue;
              }
            }

            // Record losing outcomes
            console.log(`🔍 Identifying losers for event ${event.id}`);
            const losers = await db.raw(
              `SELECT p.id, p.user_id FROM participants p
               WHERE p.event_id = ? AND p.prediction != ?`,
              [event.id, correctAnswer]
            );
            console.log(`🔍 Event ${event.id} losers found: ${losers.rows.length}`);
            
            for (const loser of losers.rows) {
              console.log(`🔍 Recording losing outcome for participant ${loser.id} (user ${loser.user_id})`);
              await db.raw(
                `INSERT INTO event_outcomes (participant_id, result, points_awarded)
                 VALUES (?, 'loss', 0)`,
                [loser.id]
              );
              
              // Add diagnostic logging
              console.log(`🔍 Inserted event_outcome for loser: participant_id=${loser.id}, result=loss, points_awarded=0`);
            }

            // Get all participants for the audit log
            console.log(`🔍 Getting all participants for audit log of event ${event.id}`);
            const { rows: participants } = await db.raw(
              'SELECT * FROM participants WHERE event_id = ?',
              [event.id]
            );
            console.log(`🔍 Event ${event.id} total participants: ${participants.length}`);
            
            // Add audit log entry
            console.log(`🔍 Adding audit log entry for event ${event.id}`);
            await db.raw(
              `INSERT INTO audit_logs (event_id, action, details)
               VALUES (?, 'event_resolution', ?)`,
              [event.id, JSON.stringify({
                 totalParticipants: participants.length,
                 totalWinners: winners.length,
                 totalPot: potData.total_pot,
                 platformFee: platformFee,
                 distributed: remainingPot,
                 feePerParticipant: winners.length > 0 ? Math.floor(winners[0].amount * 0.05) : 0,
                 resolvedAt: new Date().toISOString()
               })]
            );
            console.log(`🔍 Audit log entry added for event ${event.id}`);
            
            console.log(`✅ Distributed ${potData.total_pot} points to ${winners.length} winners for event ${event.id}`);
          } else {
            console.log(`🔍 No winners for event ${event.id}, pot not distributed`);
          }
        } else {
          console.log(`🔍 Event ${event.id} has no pot to distribute`);
        }
      } catch (error) {
        // --- START OF NEW, MORE DETAILED LOGGING ---
        if (error.response) {
            // This means the CoinGecko server responded with an error (like 429)
            console.error(`❌ Failed to resolve event ${event.id}. API Error: Status ${error.response.status} - ${error.response.statusText}. Data:`, error.response.data);
            // We'll skip this event for now and let the cron job try again later.
        } else {
            // This is for other errors, like a network failure
            console.error(`❌ Failed to resolve event ${event.id} with a non-API error:`, error.message);
        }
        // --- END OF NEW LOGGING ---
      }
    }
  } catch (error) {
    console.error('❌ Error in resolvePendingEvents:', error);
  }
}



// --- API Routes, Cron Job, and Server Startup ---
// (I am including the full working code below for completeness)

const authenticateToken = (req, res, next) => {
    console.log('Authentication middleware called for path:', req.originalUrl);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extracted from header:', token ? 'present' : 'missing');
    
    if (!token) {
        console.log('No token provided in request');
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            console.log('Token verification error details:', {
                name: err.name,
                message: err.message,
                expiredAt: err.expiredAt
            });
            // Check for specific JWT errors and return 401
            if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token is invalid or expired' });
            } else {
                // For any other unexpected errors during verification, return 500
                console.error('Unexpected error during JWT verification:', err);
                return res.status(500).json({ error: 'Internal server error during authentication' });
            }
        }
        console.log('Token verified successfully for user:', user.userId);
        console.log('Full token payload:', user);
        req.userId = user.userId;
        next();
    });
};

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));
app.get('/', (req, res) => res.json({ status: 'OK' }));

// Temporary debug endpoint to check users
app.get('/api/debug/users', async (req, res) => {
  try {
    const { rows } = await db.raw('SELECT id, username, email, points FROM users LIMIT 10');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary debug endpoint to generate a test token
app.get('/api/debug/token/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const token = jwt.sign({ userId: parseInt(userId) }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
    res.json({ token, userId });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  console.log('Registration request received:', req.body);
  const { username, email, password } = req.body;
  if (!username || !username.trim() || !email || !password) {
    console.log('Missing required fields:', { username: !!username, email: !!email, password: !!password });
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  // Make password validation more flexible - only require minimum length and character diversity
  // Allow any special characters and focus on preventing weak passwords rather than enforcing specific ones
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log('Password does not meet requirements:', password);
    return res.status(400).json({
      error: 'Password must contain at least 8 characters, including uppercase, lowercase, and numeric characters. Special characters are allowed but not required.'
    });
  }

  // Check for existing username or email
  try {
    const existingUser = await db.raw(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR email = ?',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      const conflictField = existingUser.rows[0].username === username ? 'username' : 'email';
      return res.status(409).json({ error: `${conflictField} already exists` });
    }
  } catch (error) {
    console.error('❌ Pre-validation error:', error);
    return res.status(500).json({ error: 'Server error during validation' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const trx = await db.transaction(); // Start a transaction
    try {
      
      // Create user with default points (0)
      const [newUser] = await trx('users').insert(
        { username: username.toLowerCase(), email, password_hash: passwordHash, last_login_date: new Date() },
        ['id', 'username', 'email', 'points']
      );
      
      // Award starting points using centralized function
      const startingPoints = 1000; // Give new users 1000 starting points
      const newBalance = await updateUserPoints(trx, newUser.id, startingPoints, 'registration', null);
      
      await trx.commit(); // Commit the transaction
      
      // Ensure username is returned in original case for the response
      newUser.username = username;
      newUser.points = newBalance; // Update with the new balance after points award
      
      const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: newUser });
    } catch (error) {
      await trx.rollback(); // Rollback the transaction on error
      throw error;
    }
  } catch (error) {
    if (error.code === '23505') {
      // Handle unique constraint violation
      if (error.constraint === 'users_username_unique') {
        return res.status(409).json({ error: 'Username already exists' });
      } else if (error.constraint === 'users_email_key') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(409).json({ error: 'Duplicate key violation' });
    }
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
    try {
        const { rows: [user] } = await db.raw('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR email = ?', [identifier, identifier]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Update last login date on successful login
        await db.raw('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points } });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// New event creation endpoint that accepts all parameters used by the frontend
// Validation middleware for entry fee
const validateEntryFee = (req, res, next) => {
    const { entry_fee } = req.body;
    
    if (typeof entry_fee !== 'number') {
        return res.status(400).json({ error: 'Entry fee must be a numeric value' });
    }
    if (entry_fee < 100) {
        return res.status(400).json({ error: 'Entry fee must be at least 100 points' });
    }
    if (entry_fee % 25 !== 0) {
        return res.status(400).json({ error: 'Entry fee must be divisible by 25' });
    }
    next();
};

app.post('/api/events', authenticateToken, validateEntryFee, async (req, res) => {
    const { title, description, entry_fee, start_time, end_time, location, capacity } = req.body;
    if (!title || !description || entry_fee === undefined) {
        return res.status(400).json({ error: 'Required fields: title, description, entry_fee' });
    }
    // Use current time if start_time not provided
    const startTime = start_time ? new Date(start_time) : new Date();
    // Default to 24 hours from start if end_time not provided
    const endTime = end_time ? new Date(end_time) : new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
    
    // Validate that end time is after start time
    if (endTime <= startTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    try {
        // Check for existing event with same title
        const existingEvent = await db.raw(
            'SELECT * FROM events WHERE title = ?',
            [title]
        );
        if (existingEvent.rows.length > 0) {
            return res.status(409).json({ error: 'Event title already exists' });
        }

        // Look up event type 'prediction'
        const typeQuery = await db.raw(`SELECT id FROM event_types WHERE name = 'prediction'`);
        if (typeQuery.rows.length === 0) {
            return res.status(400).json({ error: "Event type 'prediction' not found" });
        }
        const eventTypeId = typeQuery.rows[0].id;

        // Get current price for the cryptocurrency
        const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
        
        // Create price range options
        const priceRanges = coingecko.calculatePriceRanges(currentPrice);
        const options = [
          { id: 'range_0_3_up', label: '0-3% up', value: '0-3% up' },
          { id: 'range_3_5_up', label: '3-5% up', value: '3-5% up' },
          { id: 'range_5_up', label: '>5% up', value: '>5% up' },
          { id: 'range_0_3_down', label: '0-3% down', value: '0-3% down' },
          { id: 'range_3_5_down', label: '3-5% down', value: '3-5% down' },
          { id: 'range_5_down', label: '>5% down', value: '>5% down' }
        ];

        // Pre-flight table check with database-specific queries
        let tableExists;
        if (db.client.config.client === 'pg') {
          tableExists = await db.raw(
            "SELECT 1 FROM information_schema.tables WHERE table_name='events'"
          );
        } else {
          // SQLite check
          tableExists = await db.raw(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
          );
        }
        
        if (!tableExists.rows.length) {
          console.error('❌ Events table does not exist');
          return res.status(500).json({ error: 'Database schema issue' });
        }

        // Debug: Log parameters before INSERT
        console.debug(`Inserting into events table:`, {
          title,
          description,
          options: JSON.stringify(options),
          entry_fee,
          startTime,
          endTime,
          location,
          capacity,
          eventTypeId,
          currentPrice
        });

        try {
          // Create new event with all parameters
          const { rows: [newEvent] } = await db.raw(
            `INSERT INTO events (
                title, description, options, entry_fee, start_time, end_time,
                location, max_participants, current_participants, prize_pool,
                status, event_type_id, crypto_symbol, initial_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?, ?)
            RETURNING *`,
            [
                title, description, JSON.stringify(options), entry_fee,
                startTime, endTime, location || 'Global', capacity || 100, eventTypeId,
                process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', currentPrice
            ]
          );
          console.debug('Event creation successful', newEvent);
          res.status(201).json(newEvent);
          broadcastParticipation(newEvent.id);
        } catch (error) {
          console.error(`Event creation failed: ${error.message}`, {
            query: `INSERT INTO events (title, description, options, entry_fee, start_time, end_time, location, max_participants, current_participants, prize_pool, status, event_type_id, crypto_symbol, initial_price) VALUES ('${title}', '${description}', '${JSON.stringify(options)}', ${entry_fee}, '${startTime}', '${endTime}', '${location || 'Global'}', ${capacity || 100}, 0, 0, 'active', ${eventTypeId}, '${process.env.DEFAULT_CRYPTO_SYMBOL || 'btc'}', ${currentPrice})`,
            errorDetails: error
          });
          res.status(500).json({ error: 'Event creation failed' });
        }
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Event title already exists' });
        }
        console.error('❌ Event creation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tournament endpoints
// Participation endpoint for predictions
app.post('/api/events/:id/participate', authenticateToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;
  const { prediction, entryFee } = req.body;

  // Validate prediction - updated to use price range options
  const validPredictions = [
      '0-3% up', '3-5% up', '5%+ up',
      '0-3% down', '3-5% down', '5%+ down'
  ];
  
  if (!validPredictions.includes(prediction)) {
    return res.status(400).json({ error: 'Invalid prediction value' });
  }

  if (entryFee < 100 || entryFee > 1000 || entryFee % 25 !== 0) {
    return res.status(400).json({ error: 'Entry fee must be between 100-1000 and divisible by 25' });
  }

  const trx = await db.transaction();
  try {
    // Verify event is active
    const event = await trx.raw(
      'SELECT status, end_time FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );
    
    if (event.rows[0].status !== 'active' || new Date(event.rows[0].end_time) < new Date()) {
      throw new Error('EVENT_CLOSED');
    }

    // Check existing participation
    const existing = await trx.raw(
      'SELECT 1 FROM participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('DUPLICATE_ENTRY');
    }

    // Validate and deduct entry fee using centralized function
    const balanceCheck = await trx.raw(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (balanceCheck.rows[0].points < entryFee) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Use centralized function to deduct points and log transaction
    const newBalance = await updateUserPoints(trx, userId, -entryFee, 'event_entry', eventId);
    
    // Record participation
    await trx.raw(
      'INSERT INTO participants (event_id, user_id, prediction, amount) VALUES (?, ?, ?, ?)',
      [eventId, userId, prediction, entryFee]
    );

    await trx.commit();
    res.json({ success: true, newBalance });
  } catch (error) {
    await trx.rollback();
    handleParticipationError(error, res);
  } finally {
    // No need to release client with Knex transactions
  }
});

function handleParticipationError(error, res) {
switch(error.message) {
  case 'EVENT_CLOSED':
    res.status(410).json({ error: 'Event closed for predictions' });
    break;
  case 'DUPLICATE_ENTRY':
    res.status(409).json({ error: 'Already participated in this event' });
    break;
  case 'INSUFFICIENT_FUNDS':
    res.status(402).json({ error: 'Insufficient balance for entry fee' });
    break;
  case 'INVALID_PREDICTION':
    res.status(400).json({ error: 'Invalid prediction value' });
    break;
  default:
    console.error('Participation error:', error);
    res.status(500).json({ error: 'Participation failed' });
}
}

app.post('/api/events/:id/join', authenticateToken, async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.userId;
    
    let trx;
    try {
        trx = await db.transaction();

        // Get tournament details
        const tournament = await trx.raw(
            'SELECT entry_fee FROM events WHERE id = ?',
            [tournamentId]
        );
        if (tournament.rows.length === 0) {
            await trx.rollback();
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const entryFee = tournament.rows[0].entry_fee;

        // Check user balance
        const user = await trx.raw(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        );
        if (user.rows[0].points < entryFee) {
            await trx.rollback();
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Deduct entry fee
        await updateUserPoints(trx, userId, -entryFee, 'event_join', tournamentId);

        // Add participant
        await trx.raw(
            'INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)',
            [tournamentId, userId]
        );

        await trx.commit();
        res.json({ success: true, message: 'Joined tournament successfully' });
    } catch (error) {
        if (trx) await trx.rollback();
        console.error('Tournament join error:', error);
        res.status(500).json({ error: 'Failed to join tournament' });
    }
});

app.post('/api/tournaments/:id/entries', authenticateToken, async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.userId;
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'Invalid entries format' });
    }

    let trx;
    try {
        trx = await db.transaction();

        // Verify tournament exists
        const tournament = await trx.raw(
            'SELECT entry_fee FROM tournaments WHERE id = ?',
            [tournamentId]
        );
        if (tournament.rows.length === 0) {
            await trx.rollback();
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const entryFee = tournament.rows[0].entry_fee;

        // Check user balance for total entries
        const totalCost = entryFee * entries.length;
        const user = await trx.raw(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        );
        if (user.rows[0].points < totalCost) {
            await trx.rollback();
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Deduct points
        await updateUserPoints(trx, userId, -totalCost, 'tournament_entry', tournamentId);

        // Create entries
        for (const entry of entries) {
            await trx.raw(
                'INSERT INTO tournament_entries (tournament_id, user_id, entry_fee) VALUES (?, ?, ?)',
                [tournamentId, userId, entryFee]
            );
        }

        await trx.commit();
        res.json({ success: true, entries_created: entries.length });
    } catch (error) {
        if (trx) await trx.rollback();
        console.error('Tournament entry error:', error);
        res.status(500).json({ error: 'Failed to create tournament entries' });
    }
});

app.get('/api/events/:id/pot', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.raw(
            'SELECT SUM(entry_fee) AS total_pot FROM tournament_entries WHERE tournament_id = ?',
            [id]
        );
        res.json({ pot: result.rows[0].total_pot || 0 });
    } catch (error) {
        console.error('Pot calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate tournament pot' });
    }
});

// Endpoint for placing a bet on an event
app.post('/api/events/:id/bet', authenticateToken, async (req, res) => {
    const eventId = req.params.id;
    const { prediction, entryFee } = req.body;
    const userId = req.userId;
    
    console.log('DEBUG: Bet placement request received', { eventId, userId, prediction });
    
    // Validate event configuration first
    try {
        // Get event details including entry fee
        const eventQuery = await db.raw(
            'SELECT entry_fee, end_time, status FROM events WHERE id = ?',
            [eventId]
        );
        
        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const event = eventQuery.rows[0];
        
        // Validate entry fee structure
        console.log('Validating event entry fee - Value:', event.entry_fee, 'Type:', typeof event.entry_fee);
        if (typeof event.entry_fee !== 'number' || event.entry_fee < 100) {
            console.log('Invalid entry fee configuration detected:', event.entry_fee);
            return res.status(400).json({ error: 'Invalid event configuration' });
        }
        
        // Check event status
        const now = new Date();
        const endTime = new Date(event.end_time);
        if (now >= endTime || event.status !== 'active') {
            return res.status(400).json({ error: 'Event is no longer active' });
        }
    } catch (error) {
        console.error('Event validation failed:', error);
        return res.status(500).json({ error: 'Failed to validate event' });
    }
    
    // Validate entry fee - use provided entryFee or default to event entry_fee
    const selectedEntryFee = entryFee || event.entry_fee;
    const validEntryFees = [100, 200, 500, 1000];
    
    if (!validEntryFees.includes(selectedEntryFee)) {
        return res.status(400).json({
            error: 'Invalid entry fee. Must be one of: ' + validEntryFees.join(', ')
        });
    }
    
  

    // Dynamically validate prediction against the event's actual options
    try {
        const eventOptionsQuery = await db.raw('SELECT options FROM events WHERE id = ?', [eventId]);
        if (eventOptionsQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found for validation' });
        }
        
        const eventOptions = eventOptionsQuery.rows[0].options; // This can be a JSON string or an array of objects
        let validPredictions = [];
        
        if (typeof eventOptions === 'string') {
            const parsedOptions = JSON.parse(eventOptions);
            // Check if it's an array of strings (like ['Higher', 'Lower'])
            if (typeof parsedOptions[0] === 'string') {
                validPredictions = parsedOptions;
            } else { // It's an array of objects (like [{label, value}, ...])
                validPredictions = parsedOptions.map(opt => opt.value);
            }
        } else if (Array.isArray(eventOptions)) { // It's already parsed from the DB
             validPredictions = eventOptions.map(opt => opt.value);
        }

        if (!validPredictions.includes(prediction)) {
            console.log('DEBUG: Invalid prediction value', { prediction, validOptions: validPredictions });
            return res.status(400).json({ error: 'Invalid prediction value submitted' });
        }
    } catch (e) {
        console.error("Error during prediction validation:", e);
        return res.status(500).json({ error: 'Server error during prediction validation' });
    }

    let trx;
    try {
        console.log('DEBUG: Attempting to acquire database client');
        trx = await db.transaction();
        console.log('DEBUG: Database client acquired successfully');
    } catch (error) {
        console.error('Failed to acquire database client:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    try {
        console.log('DEBUG: Starting transaction');
        // await trx.query('BEGIN'); // Knex handles BEGIN implicitly
        console.log('DEBUG: Transaction started');

        // Check event exists
        console.log('DEBUG: Checking if event exists', { eventId });
        const eventQuery = await trx.raw('SELECT * FROM events WHERE id = ?', [eventId]);
        if (eventQuery.rows.length === 0) {
            console.log('DEBUG: Event not found', { eventId });
            await trx.rollback();
            return res.status(404).json({ error: 'Event not found' });
        }
        const event = eventQuery.rows[0];
        console.log('DEBUG: Event found', { event });
        
        // Check if event is still active
        const now = new Date();
        const endTime = new Date(event.end_time);
        console.log('DEBUG: Checking event time', { now, endTime, isEnded: now >= endTime });
        if (now >= endTime) {
            console.log('DEBUG: Event has ended', { eventId });
            await trx.rollback();
            return res.status(400).json({ error: 'Event has ended' });
        }
        
        // Check user has sufficient points
        console.log('DEBUG: Checking user points', { userId });
        const userQuery = await trx.raw('SELECT points FROM users WHERE id = ?', [userId]);
        if (userQuery.rows.length === 0) {
            console.log('DEBUG: User not found', { userId });
            await trx.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userQuery.rows[0];
        console.log('DEBUG: User points check', { userId, userPoints: user.points, entryFee: selectedEntryFee, sufficient: user.points >= selectedEntryFee });
        console.log('User points vs entry fee:', {
          userPoints: user.points,
          entryFee: selectedEntryFee,
          comparison: user.points >= selectedEntryFee
        });
        if (user.points < selectedEntryFee) {
            console.log('DEBUG: Insufficient points', { userId, userPoints: user.points, entryFee: selectedEntryFee });
            await trx.rollback();
            return res.status(400).json({ error: 'Insufficient points' });
        }


        // Insert bet into participants table
        console.log('DEBUG: Inserting bet into participants table', { eventId, userId, prediction, amount: selectedEntryFee });
        
        // First, check if the amount column exists in the participants table
        try {
            if (db.client.config.client === 'pg') {
                const columnCheck = await trx.raw(
                    `SELECT column_name
                     FROM information_schema.columns
                     WHERE table_name = 'participants' AND column_name = 'amount'`
                );
                
                if (columnCheck.rows.length === 0) {
                    console.error('ERROR: amount column does not exist in participants table');
                    await trx.rollback();
                    return res.status(500).json({ error: 'Database schema error: amount column missing' });
                }
            } else {
                // For SQLite
                const columnCheck = await trx.raw(
                    `PRAGMA table_info(participants)`
                );
                
                const hasAmountColumn = columnCheck.rows.some(row => row.name === 'amount');
                if (!hasAmountColumn) {
                    console.error('ERROR: amount column does not exist in participants table');
                    await trx.rollback();
                    return res.status(500).json({ error: 'Database schema error: amount column missing' });
                }
            }
        } catch (schemaError) {
            console.error('ERROR: Failed to check participants table schema', schemaError);
            await trx.rollback();
            return res.status(500).json({ error: 'Database schema check failed' });
        }
        
        const { rows: [newBet] } = await trx.raw(
            `INSERT INTO participants (event_id, user_id, prediction, amount)
             VALUES (?, ?, ?, ?)
             RETURNING *`,
            [eventId, userId, prediction, selectedEntryFee]
        );
        console.log('DEBUG: Bet inserted successfully', { newBet });

        // Deduct the bet amount from the user's points
        console.log('DEBUG: Deducting bet amount from user points', { userId, amount: selectedEntryFee });
        await updateUserPoints(trx, userId, -selectedEntryFee, 'bet', eventId);
        console.log('DEBUG: Entry fee deducted successfully');
        
        // Remove prize_pool update as it's now calculated from participants table
        console.log('DEBUG: Updating event total_bets', { eventId });
        await trx.raw(
            `UPDATE events
             SET total_bets = total_bets + 1
             WHERE id = ?`,
            [eventId]
        );
        console.log('DEBUG: Event total_bets updated successfully');
        
        // Update current_participants count
        console.log('DEBUG: Updating event current_participants count', { eventId });
        await trx.raw(
            `UPDATE events
             SET current_participants = (
               SELECT COUNT(*) FROM participants WHERE event_id = ?
             )
             WHERE id = ?`,
            [eventId, eventId]
        );
        console.log('DEBUG: Event current_participants count updated successfully');
        
        await trx.commit();
        console.log('DEBUG: Transaction committed successfully', { newBet });
        res.status(201).json(newBet);
    } catch (error) {
        console.log('DEBUG: Error in bet placement, attempting rollback', { error });
        if (trx) {
            try {
                await trx.rollback();
                console.log('DEBUG: Transaction rolled back successfully');
            } catch (rollbackError) {
                console.error('Failed to rollback transaction:', rollbackError);
            }
        }
        console.error('❌ Bet placement error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        // Knex transactions automatically release the connection
    }
});

// GET active events
// Temporary debug endpoint
app.get('/api/debug/participants-schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'participants'
    `);
    console.log('Participants table schema:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Schema debug failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/active', async (req, res) => {
  try {
    // Log request details for debugging
    console.log('DEBUG: /api/events/active endpoint called');
    console.log('Request headers:', req.headers);
    console.log('Request query parameters:', req.query);
    
    // Validate query parameters if any
    // Add specific validation logic here if needed
    // For now, we just check for unexpected parameters
    const allowedParams = ['limit', 'offset']; // Add any parameters you want to allow
    const queryParams = Object.keys(req.query);
    const invalidParams = queryParams.filter(param => !allowedParams.includes(param));
    
    if (invalidParams.length > 0) {
      console.log('Invalid query parameters:', invalidParams);
      // We don't return an error for invalid parameters, just log them
    }
    
    const isPostgres = db.client.config.client === 'pg';
    
    const queryText = `
      WITH participant_stats AS (
        SELECT
          event_id,
          COUNT(*) AS total_participants,
          SUM(amount) AS total_prize_pool,
          SUM(CASE WHEN prediction LIKE '%up%' THEN 1 ELSE 0 END) AS up_bets,
          SUM(CASE WHEN prediction LIKE '%down%' THEN 1 ELSE 0 END) AS down_bets
        FROM participants
        GROUP BY event_id
      )
      SELECT
        e.id,
        e.title,
        e.description,
        e.options,
        e.entry_fee,
        e.start_time,
        e.end_time,
        e.initial_price,
        e.final_price,
        e.status,
        e.resolution_status,
        e.correct_answer,
        COALESCE(ps.total_participants, 0) AS current_participants,
        COALESCE(ps.total_prize_pool, 0) AS prize_pool,
        ${isPostgres ? `json_build_object(
          'up', COALESCE(ps.up_bets * 100.0 / NULLIF(ps.total_participants, 0), 0),
          'down', COALESCE(ps.down_bets * 100.0 / NULLIF(ps.total_participants, 0), 0)
        )` : `json_object(
          'up', COALESCE(ps.up_bets * 100.0 / CASE WHEN ps.total_participants = 0 THEN NULL ELSE ps.total_participants END, 0),
          'down', COALESCE(ps.down_bets * 100.0 / CASE WHEN ps.total_participants = 0 THEN NULL ELSE ps.total_participants END, 0)
        )`} AS prediction_distribution,
        et.name as event_type
      FROM events e
      LEFT JOIN participant_stats ps ON e.id = ps.event_id
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.status = 'active' OR e.resolution_status = 'pending'`;
    
    sqlLogger.debug({query: queryText}, "Executing active events query");
    console.log('DEBUG: Executing query:', queryText);
    
    const { rows } = await db.raw(queryText);
    console.log('DEBUG: Query result rows count:', rows.length);
    const now = new Date();

    // More robust data transformation with error handling
    const activeEvents = rows.map(event => {
      try {
        // Handle null/undefined values gracefully
        const endTime = event.end_time ? new Date(event.end_time) : new Date();
        const startTime = event.start_time ? new Date(event.start_time) : new Date();
        
        // Add price range information for active events
        let priceRanges = null;
        if ((event.status === 'active' || event.resolution_status === 'pending') && event.initial_price) {
          try {
            priceRanges = coingecko.calculatePriceRanges(event.initial_price);
          } catch (error) {
            console.error('Failed to calculate price ranges:', error);
          }
        }
        
        return {
          ...event,
          end_time: endTime.toISOString(),
          start_time: startTime.toISOString(),
          time_remaining: Math.floor((endTime - now) / 1000),
          status: endTime <= now ? 'expired' : (event.status || 'active'),
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null,
          price_ranges: priceRanges
        };
      } catch (transformError) {
        console.error('Error transforming event data:', transformError, event);
        // Return event with safe defaults
        return {
          ...event,
          end_time: event.end_time ? new Date(event.end_time).toISOString() : new Date().toISOString(),
          start_time: event.start_time ? new Date(event.start_time).toISOString() : new Date().toISOString(),
          time_remaining: 0,
          status: event.status || 'active',
          prize_pool: event.prize_pool || 0,
          current_participants: event.current_participants || 0,
          entry_fee: event.entry_fee || 0,
          initial_price: event.initial_price || 0,
          final_price: event.final_price || null,
          price_ranges: null
        };
      }
    });

    console.log('DEBUG: Returning active events count:', activeEvents.length);
    res.json(activeEvents);
  } catch (error) {
    console.error('Error in /api/events/active endpoint:', error);
    // Return 500 with error details for better debugging
    res.status(500).json({
      error: 'Failed to fetch active events',
      message: error.message
    });
  }
});

app.get('/api/events/:id/participations', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch all participant entries for the event, ordered by creation time
    const { rows } = await db.raw(
      `SELECT prediction, created_at FROM participants WHERE event_id = ? ORDER BY created_at ASC`,
      [id]
    );


    res.json(rows);
    
  } catch (error) {
    console.error('Error fetching participation history:', error);
    res.status(500).json({ error: 'Internal server error while fetching participation history' });
  }
});



// THE NEW ROUTE ABOVE MUST BE PLACED BEFORE THE EXISTING ROUTE BELOW
app.get('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(id) || !Number.isInteger(parseFloat(id))) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }
    
    const eventId = parseInt(id);

    const event = await db('events').where('id', eventId).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const prizePool = await db('participants')
      .where('event_id', eventId)
      .sum('amount as total')
      .first();
    
    event.prize_pool = prizePool.total || 0;

    const userPrediction = await db('participants')
      .where('event_id', eventId)
      .andWhere('user_id', req.userId)
      .select('prediction')
      .first();

    event.user_prediction = userPrediction ? userPrediction.prediction : null;

    const optionVolumes = await db('participants')
      .select('prediction')
      .sum('amount as total_amount')
      .where('event_id', eventId)
      .groupBy('prediction');

    event.option_volumes = optionVolumes.reduce((acc, row) => {
      acc[row.prediction] = {
        total_amount: row.total_amount,
        multiplier: event.prize_pool > 0 && row.total_amount > 0 ? event.prize_pool / row.total_amount : 0
      };
      return acc;
    }, {});

    const participants = await db('participants').where('event_id', eventId).count('id as count').first();
    event.current_participants = participants.count;

    if (event.status === 'active' || event.resolution_status === 'pending') {
      try {
        const coinGeckoIdMap = {
          'btc': 'bitcoin',
          'eth': 'ethereum',
          'sol': 'solana',
          'ada': 'cardano'
        };
        const coinGeckoId = coinGeckoIdMap[event.crypto_symbol] || 'bitcoin';
        event.current_price = await coingecko.getCurrentPrice(coinGeckoId);
        
        if (event.initial_price) {
          event.price_ranges = coingecko.calculatePriceRanges(event.initial_price);
        }
      } catch (error) {
        console.error('Failed to fetch current price:', error);
        event.current_price = null;
      }
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Other routes...
// Claim free points endpoint
app.post('/api/user/claim-free-points', authenticateToken, async (req, res) => {
  try {
    // Log the incoming request
    console.log('Claim free points request received for user:', req.userId);
    
    // Ensure req.userId is present
    if (!req.userId) {
      console.error('Error: req.userId is undefined or null in claim-free-points endpoint');
      return res.status(400).json({ error: 'User ID not available' });
    }

    // Check if user has already claimed points today
    // Query only last_claimed column as ensureUsersTableIntegrity ensures this is the correct column
    const { rows: claimCheck } = await db.raw(
      `SELECT id, points, last_claimed, last_login_date FROM users WHERE id = ?`,
      [req.userId]
    );

    // Log for debugging
    console.log('User claim check result:', claimCheck);
    
    // claimCheck will always be an array, even if empty.
    // The previous `if (!claimCheck)` was unreachable.
    if (!Array.isArray(claimCheck) || claimCheck.length === 0) {
      console.log('User not found in database for claim request or query failed to return rows');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if the user object is valid
    if (!claimCheck[0]) {
      console.error('User object is undefined or null for user:', req.userId);
      return res.status(500).json({ error: 'User data is invalid' });
    }

    const user = claimCheck[0];
    // Use last_claimed if available, otherwise fall back to last_claim_date
    const lastClaimed = user.last_claimed || user.last_claim_date;
    const now = new Date();
    
    // Log user details for debugging
    console.log('User details:', {
      id: user.id,
      points: user.points,
      last_claimed: lastClaimed,
      last_login_date: user.last_login_date
    });

    // Log last claimed time and current time for debugging
    console.log('Last claimed time:', lastClaimed);
    console.log('Current time:', now);

    // Check if user has claimed within the last 24 hours
    if (lastClaimed) {
      const lastClaimedDate = new Date(lastClaimed);
      
      // Check if the date is valid
      if (isNaN(lastClaimedDate.getTime())) {
        console.log('Invalid last claimed date, treating as no previous claim');
      } else {
        const timeDifference = now - lastClaimedDate;
        const hoursSinceLastClaim = timeDifference / (1000 * 60 * 60);
        
        console.log('Time calculation details:', {
          now: now.toISOString(),
          lastClaimed: lastClaimedDate.toISOString(),
          timeDifference: timeDifference,
          hoursSinceLastClaim: hoursSinceLastClaim,
        });
        
        if (hoursSinceLastClaim < 24) {
          console.log('User attempted to claim points within 24 hours');
          return res.status(400).json({
            message: 'You already claimed free points today',
            hoursRemaining: Math.ceil(24 - hoursSinceLastClaim),
            lastClaimed: lastClaimed,
            currentTime: now
          });
        }
      }
    }

    // Log before updating user points
    console.log('Awarding 250 points to user:', req.userId);
    
    // Use transaction for all database operations
    const trx = await db.transaction();
    try {
      // Award 250 points to the user using centralized function
      const pointsToAward = 250;
      const newBalance = await updateUserPoints(trx, req.userId, pointsToAward, 'daily_claim', null);
      
      // Update last_claimed and last_login_date timestamps
      const { rows: [updatedUser] } = await trx.raw(
        `UPDATE users
         SET last_claimed = NOW(), last_login_date = NOW()
         WHERE id = ?
         RETURNING id, username`,
        [req.userId]
      );
      updatedUser.points = newBalance;

      await trx.commit();
      
      // Log successful claim
      console.log('Successfully awarded points to user:', {
        userId: req.userId,
        pointsAwarded: pointsToAward,
        newTotal: updatedUser.points
      });
      
      res.json({
        message: 'Successfully claimed free points!',
        points: pointsToAward,
        newTotal: updatedUser.points
      });
    } catch (transactionError) {
      await trx.rollback();
      console.error('Error during transaction, rolled back.', transactionError);
      res.status(500).json({ error: 'Failed to claim points due to a database error.' });
    }
  } catch (error) {
    console.error('Error in claim-free-points endpoint:', error);
    res.status(500).json({ error: 'Internal server error during claim process' });
  }
});

// GET user profile endpoint
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.raw(
      'SELECT id, username, email, points, is_admin FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET user prediction history
app.get('/api/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // First, let's check what participants this user has
    const participantCheck = await db.raw(
      `SELECT id, event_id, prediction, amount FROM participants WHERE user_id = ?`,
      [userId]
    );
    console.log(`Participants for user ${userId}:`, JSON.stringify(participantCheck.rows, null, 2));
    
    // Then check what's in the event_outcomes table for debugging
    const outcomeCheck = await db.raw(
      `SELECT * FROM event_outcomes LIMIT 10`
    );
    console.log('Event outcomes table contents (first 10 rows):', JSON.stringify(outcomeCheck.rows, null, 2));
    
    const { rows } = await db.raw(
      `SELECT
         p.id AS participation_id,
         e.id AS event_id,
         e.title,
         e.initial_price,
         e.final_price,
         e.crypto_symbol,
         e.resolution_status,
         e.start_time,
         e.end_time,
         e.correct_answer,
         p.prediction,
         p.amount AS entry_fee,
         o.result,
         o.points_awarded,
         CASE
           WHEN e.resolution_status = 'resolved' THEN
             CASE
               WHEN p.prediction = e.correct_answer THEN 'win'
               ELSE 'loss'
             END
           ELSE 'pending'
         END AS resolution_state,
         a.details AS resolution_details
       FROM participants p
       JOIN events e ON p.event_id = e.id
       LEFT JOIN event_outcomes o ON p.id = o.participant_id
       LEFT JOIN audit_logs a ON e.id = a.event_id AND a.action = 'event_resolution'
       WHERE p.user_id = ?
       ORDER BY e.start_time DESC`,
      [userId]
    );
    
    // Add diagnostic logging
    console.log(`User history query for user ${userId}:`, JSON.stringify(rows, null, 2));
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user prediction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password endpoint
// Email change verification endpoint
app.post('/api/user/request-email-change', authenticateToken, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const userId = req.userId;

    // Validate input
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if new email is same as current email
    const { rows: [user] } = await db.raw(
      'SELECT email, password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email === newEmail) {
      return res.status(400).json({ error: 'New email cannot be the same as current email' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new email is already in use
    const { rows: existingUser } = await db.raw(
      'SELECT id FROM users WHERE email = ?',
      [newEmail]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Generate verification token and expiration
    const verificationToken = generateVerificationToken();
    const expiresAt = getExpirationTime();

    // Store verification request in database
    await db.raw(
      `INSERT INTO email_change_verifications (user_id, new_email, verification_token, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, newEmail, verificationToken, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail(newEmail, verificationToken);

    res.json({
      message: 'Verification email sent! Please check your new email address to complete the process.',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Email change request error:', error);
    res.status(500).json({ error: 'Failed to process email change request' });
  }
});

// Email verification endpoint
app.post('/api/user/verify-email-change', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find and validate verification token
    const { rows: [verification] } = await db.raw(
      `SELECT * FROM email_change_verifications
       WHERE verification_token = ? AND expires_at > NOW() AND used = FALSE`,
      [token]
    );

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const trx = await db.transaction();
    try {
      // Update user's email
      const { rows: [updatedUser] } = await trx.raw(
        'UPDATE users SET email = ? WHERE id = ? RETURNING id, email, username',
        [verification.new_email, verification.user_id]
      );

      // Mark token as used
      await trx.raw(
        'UPDATE email_change_verifications SET used = TRUE WHERE id = ?',
        [verification.id]
      );

      // Clean up expired tokens for this user
      await trx.raw(
        'DELETE FROM email_change_verifications WHERE user_id = ? AND (expires_at <= NOW() OR used = TRUE)',
        [verification.user_id]
      );

      await trx.commit();

      res.json({
        success: true,
        message: 'Email address successfully updated!',
        user: updatedUser
      });

    } catch (error) {
      await trx.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email change' });
  }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  const userId = req.userId; // This comes from your authenticateToken middleware
  const { currentPassword, newPassword } = req.body;

  // 1. Server-side validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }

  try {
    // 2. Fetch the user's current HASHED password from the database
    // This MUST match your 'users' table schema. It is 'password_hash'.
    const userResult = await db.raw(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const storedHashedPassword = userResult.rows[0].password_hash;

    // 3. Securely compare the provided current password with the stored hash
    const isMatch = await bcrypt.compare(currentPassword, storedHashedPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 4. Hash the new password before saving it
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    // 5. Update the 'password_hash' column in the database
    await db.raw(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newHashedPassword, userId]
    );

    // 6. Send a success response
    res.status(200).json({ message: 'Password changed successfully!' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// GET user points history
app.get('/api/user/points-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Query to get all points history for the logged-in user
    const { rows } = await db.raw(
      `SELECT change_amount, new_balance, reason, event_id, created_at
       FROM points_history
       WHERE user_id = ?
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching points history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Add this at the top of the file
const sqlLogger = require('pino')({name: "SQL"});


app.get('/api/events', async (req, res) => { /* ... */ });

// For testing: manually trigger event resolution
app.post('/api/events/resolve', authenticateAdmin, async (req, res) => {
    try {
        await resolvePendingEvents();
        res.json({ success: true, message: "Resolution job triggered" });
    } catch (error) {
        console.error('Error in manual event resolution:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

cron.schedule('0 * * * *', () => resolvePendingEvents()); // Run hourly at minute 0

// --- Initial Event Creation Function ---
async function createInitialEvent() {
  try {
    const query = db.client.config.client === 'pg'
      ? "SELECT 1 FROM events WHERE start_time > NOW() - INTERVAL '1 day' LIMIT 1"
      : "SELECT 1 FROM events WHERE start_time > datetime('now', '-1 day') LIMIT 1";
    const existing = await db.raw(query);
    if (existing.rows.length === 0) {
      const price = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
      console.log('Initial event creation triggered with price:', price);
      await createEvent(price);
    }
  } catch (error) {
    console.error('Initial event creation failed:', error);
  }
}

// --- Daily Event Creation Function ---
// Add monitoring variables
let lastEventCreationAttempt = null;
let lastEventCreationSuccess = null;

async function createDailyEvent() {
  lastEventCreationAttempt = new Date();
  
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    console.log('Daily event creation triggered with price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
    lastEventCreationSuccess = new Date();
  } catch (error) {
    console.error('Error creating daily event:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Try fallback with default price
    try {
      console.log('Attempting fallback event creation with default price...');
      await createEvent(50000); // Default price
      console.log("Created fallback Bitcoin event with default price: $50000");
      lastEventCreationSuccess = new Date();
    } catch (fallbackError) {
      console.error('Fallback event creation also failed:', {
        message: fallbackError.message,
        stack: fallbackError.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Schedule cron jobs
cron.schedule('0 0 * * *', createDailyEvent); // Run daily at midnight UTC
cron.schedule('0 0 * * *', resolvePendingEvents); // Run daily at midnight UTC


// --- Admin Manual Event Creation Endpoint ---
// This endpoint allows admin to manually create events with custom parameters
adminRouter.post('/events/create', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      options,
      entry_fee,
      max_participants,
      start_time,
      end_time,
      crypto_symbol,
      initial_price,
      prediction_window,
    } = req.body;

    // Validate required fields
    if (!title || !options || entry_fee === undefined || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Missing required fields: title, options, entry_fee, start_time, end_time'
      });
    }

    // Validate entry fee
    if (entry_fee < 100 || entry_fee % 25 !== 0) {
      return res.status(400).json({
        error: 'Entry fee must be at least 100 points and divisible by 25'
      });
    }

    // Validate dates
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for start_time or end_time' });
    }

    if (endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Validate options is a valid JSON array
    let parsedOptions;
    try {
      parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
      if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
        throw new Error('Options must be a non-empty array');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid options format. Must be a valid JSON array' });
    }

    // Check for existing event with same title
    const existingEvent = await db.raw(
      'SELECT * FROM events WHERE title = ?',
      [title]
    );
    
    if (existingEvent.rows.length > 0) {
      return res.status(409).json({ error: 'Event title already exists' });
    }

    // Look up event type 'prediction'
    const typeQuery = await db.raw(`SELECT id FROM event_types WHERE name = 'prediction'`);
    if (typeQuery.rows.length === 0) {
      return res.status(400).json({ error: "Event type 'prediction' not found" });
    }
    const eventTypeId = typeQuery.rows[0].id;

    // Get current price if initial_price is not provided
    let finalInitialPrice = initial_price;
    if (!finalInitialPrice && crypto_symbol) {
      try {
        finalInitialPrice = await coingecko.getCurrentPrice(crypto_symbol);
      } catch (error) {
        console.warn('Failed to fetch current price, using default:', error.message);
        finalInitialPrice = 50000; // Default price
      }
    }

    // Create new event with all parameters
    const { rows: [newEvent] } = await db.raw(
      `INSERT INTO events (
        title, description, category, options, entry_fee, max_participants,
        start_time, end_time, crypto_symbol, initial_price, prediction_window,
        event_type_id, status, resolution_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending')
      RETURNING *`,
      [
        title,
        description || '',
        category || 'crypto',
        JSON.stringify(parsedOptions),
        entry_fee,
        max_participants || 100,
        startTime,
        endTime,
        crypto_symbol || 'bitcoin',
        finalInitialPrice || 50000,
        prediction_window || '24 hours',
        eventTypeId
      ]
    );

    console.log('Admin created new event:', newEvent);
    res.status(201).json({ success: true, data: newEvent });

  } catch (error) {
    console.error('Admin event creation failed:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Event title already exists' });
    }
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
});

// Add monitoring endpoint for event creation status
app.get('/api/admin/events/status', authenticateAdmin, async (req, res) => {
  // Reference the global variables (defined near createDailyEvent)
  res.json({
    lastAttempt: lastEventCreationAttempt,
    lastSuccess: lastEventCreationSuccess,
    timeSinceLastAttempt: lastEventCreationAttempt ? Date.now() - lastEventCreationAttempt.getTime() : null,
    timeSinceLastSuccess: lastEventCreationSuccess ? Date.now() - lastEventCreationSuccess.getTime() : null
  });
});

// Admin endpoint to get total platform fees
adminRouter.get('/platform-fees/total', async (req, res) => {
  try {
    const result = await db.raw('SELECT COALESCE(SUM(platform_fee), 0) as total_fees FROM events');
    const totalFees = parseInt(result.rows[0].total_fees) || 0;
    res.json({ total_platform_fees: totalFees });
  } catch (error) {
    console.error('Error fetching total platform fees:', error);
    res.status(500).json({ error: 'Failed to fetch total platform fees' });
  }
});

// Manual event resolution function
async function manualResolveEvent(trx, eventId, correctAnswer, finalPrice = null) {
  // const trx = await db.transaction(); // Transaction is passed in
  try {
    // Get event details
    const eventQuery = await trx.raw(
      'SELECT * FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );
    
    if (eventQuery.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventQuery.rows[0];
    
    // Validate event can be resolved
    if (event.resolution_status === 'resolved') {
      throw new Error('Event already resolved');
    }

    // Update event with manual resolution
    const updateQuery = finalPrice
      ? `UPDATE events SET correct_answer = ?, final_price = ?, resolution_status = 'resolved' WHERE id = ? RETURNING *`
      : `UPDATE events SET correct_answer = ?, resolution_status = 'resolved' WHERE id = ? RETURNING *`;
    
    const updateParams = finalPrice
      ? [correctAnswer, finalPrice, eventId]
      : [correctAnswer, eventId];
    
    const { rows: [updatedEvent] } = await trx.raw(updateQuery, updateParams);

    // Calculate total pot from participants
    const { rows: [potData] } = await trx.raw(
      `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = ?`,
      [eventId]
    );

    const totalPot = potData.total_pot || 0;
    
    if (totalPot > 0) {
      // Calculate platform fee (5%) and remaining pot
      const platformFee = Math.floor(totalPot * 0.05);
      const remainingPot = totalPot - platformFee;

      // Update event with platform fee
      await trx.raw(
        'UPDATE events SET platform_fee = platform_fee + ? WHERE id = ?',
        [platformFee, eventId]
      );

      // Get all winners with their bet amounts
      const { rows: winners } = await trx.raw(
        `SELECT id, user_id, amount FROM participants WHERE event_id = ? AND prediction = ?`,
        [eventId, correctAnswer]
      );

      if (winners.length > 0) {
        // Calculate total amount bet by winners
        const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);

        // Award proportional share of pot to each winner
        for (const winner of winners) {
          const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * remainingPot);
          const winnerFee = Math.floor(winner.amount * 0.05);

          // Record fee contribution
          await trx.raw(
            'INSERT INTO platform_fees (event_id, participant_id, fee_amount) VALUES (?, ?, ?)',
            [eventId, winner.id, winnerFee]
          );

          // Update user points using centralized function and record outcome
          const newBalance = await updateUserPoints(trx, winner.user_id, winnerShare, 'event_win', eventId);

          await trx.raw(
            `INSERT INTO event_outcomes (participant_id, result, points_awarded)
             VALUES (?, 'win', ?)`,
            [winner.id, winnerShare]
          );
        }

        // Record losing outcomes
        const { rows: losers } = await trx.raw(
          `SELECT p.id, p.user_id FROM participants p
           WHERE p.event_id = ? AND p.prediction != ?`,
          [eventId, correctAnswer]
        );

        for (const loser of losers) {
          await trx.raw(
            `INSERT INTO event_outcomes (participant_id, result, points_awarded)
             VALUES (?, 'loss', 0)`,
            [loser.id]
          );
        }

        // Add audit log entry
        await trx.raw(
          `INSERT INTO audit_logs (event_id, action, details)
           VALUES (?, 'manual_event_resolution', ?)`,
          [eventId, JSON.stringify({
            totalParticipants: winners.length + losers.length,
            totalWinners: winners.length,
            totalPot: totalPot,
            platformFee: platformFee,
            distributed: remainingPot,
            resolvedBy: 'admin',
            resolvedAt: new Date().toISOString(),
            correctAnswer: correctAnswer,
            finalPrice: finalPrice
          })]
        );
      }
    }

    // await trx.query('COMMIT'); // Commit is handled by the caller
    
    // Broadcast resolution to all connected clients
    broadcastEventResolution(eventId, {
      correctAnswer,
      finalPrice,
      status: 'resolved'
    });

    return updatedEvent;

  } catch (error) {
    // await trx.query('ROLLBACK'); // Rollback is handled by the caller
    throw error;
  }
}

// Broadcast event resolution to WebSocket clients
function broadcastEventResolution(eventId, resolutionData) {
  if (clients && clients.size > 0) {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'event_resolved',
          eventId,
          ...resolutionData
        }));
      }
    });
  }
}

// Admin endpoint to get all events with pagination and filtering
adminRouter.get('/events', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Build base query
    let query = `
      SELECT
        e.*,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id) as participant_count,
        COALESCE((SELECT SUM(amount) FROM participants WHERE event_id = e.id), 0) as total_pot
      FROM events e
    `;
    const queryParams = [];
    const whereConditions = [];

    // Add search filter
    if (search) {
      whereConditions.push(`e.title ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${search}%`);
    }

    // Add status filter
    if (status !== 'all') {
      if (status === 'pending') {
        whereConditions.push(`e.resolution_status = $${queryParams.length + 1}`);
        queryParams.push('pending');
      } else if (status === 'resolved') {
        whereConditions.push(`e.resolution_status = $${queryParams.length + 1}`);
        queryParams.push('resolved');
      } else if (status === 'active') {
        whereConditions.push(`e.status = $${queryParams.length + 1}`);
        queryParams.push('active');
      }
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ordering and pagination
    query += ` ORDER BY e.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Get events
    const { rows: events } = await db.raw(query, queryParams);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM events e`;
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    const { rows: countRows } = await db.raw(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countRows[0].count);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Admin endpoint to get event participants
adminRouter.get('/events/:id/participants', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Validate event ID
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Get participants for the event with user information
    const { rows: participants } = await db.raw(`
      SELECT
        p.id,
        p.user_id,
        u.username,
        p.prediction,
        p.amount,
        p.created_at,
        o.result as outcome,
        o.points_awarded
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN event_outcomes o ON p.id = o.participant_id
      WHERE p.event_id = ?
      ORDER BY p.created_at DESC
    `, [eventId]);

    res.json(participants);
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch event participants' });
  }
});

// Admin endpoint for event templates (placeholder - returns empty array for now)
adminRouter.get('/event-templates', async (req, res) => {
  try {
    // For now, return empty array as templates functionality isn't implemented yet
    res.json([]);
  } catch (error) {
    console.error('Error fetching event templates:', error);
    res.status(500).json({ error: 'Failed to fetch event templates' });
  }
});

// Admin user management endpoints
adminRouter.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Build base query with search functionality
    let query = `
      SELECT
        id, username, email, points, is_admin, is_suspended,
        total_events, won_events, last_login_date, created_at
      FROM users
    `;
    const queryParams = [];
    const whereConditions = [];
    
    // Add search filter
    if (search) {
      whereConditions.push(`(username ILIKE $${queryParams.length + 1} OR email ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    // Get users
    const { rows: users } = await db.raw(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM users`;
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    const { rows: countRows } = await db.raw(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countRows[0].count);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

adminRouter.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const { rows } = await db.raw(`
      SELECT
        id, username, email, points, is_admin, is_suspended,
        total_events, won_events, last_login_date, created_at
      FROM users
      WHERE id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

adminRouter.put('/users/:id/points', async (req, res) => {
  try {
    const userId = req.params.id;
    const { points, reason } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof points !== 'number') {
      return res.status(400).json({ error: 'Points must be a number' });
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
        const trx = await db.transaction();
    
        try {
    
          // Get current points
    
          const { rows: userRows } = await trx.raw(
    
            'SELECT points, username FROM users WHERE id = ? FOR UPDATE',
    
            [userId]
    
          );
    
          
    
          if (userRows.length === 0) {
    
            await trx.rollback();
    
            return res.status(404).json({ error: 'User not found' });
    
          }
    
          
    
          const currentPoints = userRows[0].points;
    
          const username = userRows[0].username;
    
          const newPoints = currentPoints + points;
    
          
    
          // Update user points
    
          await trx.raw(
    
            'UPDATE users SET points = ? WHERE id = ?',
    
            [newPoints, userId]
    
          );
    
          
    
          // Log the adjustment in audit_logs
    
          await trx.raw(
    
            `INSERT INTO audit_logs (action, details) VALUES ('points_adjustment', ?) `,
    
            [JSON.stringify({
    
              admin_id: req.userId,
    
              user_id: userId,
    
              user_username: username,
    
              points_adjustment: points,
    
              reason: reason.trim(),
    
              points_before: currentPoints,
    
              points_after: newPoints,
    
              timestamp: new Date().toISOString()
    
            })]
    
          );
    
          
    
          await trx.commit();
    
          
    
          res.json({
    
            success: true,
    
            points_adjusted: points,
    
            new_total: newPoints,
    
            user_id: userId,
    
            user_username: username
    
          });
    
          
    
        } catch (error) {
    
          await trx.rollback();
    
          throw error;
    
        }
  } catch (error) {
    console.error('Error adjusting user points:', error);
    res.status(500).json({ error: 'Failed to adjust user points' });
  }
});

adminRouter.put('/users/:id/role', async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_admin } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof is_admin !== 'boolean') {
      return res.status(400).json({ error: 'is_admin must be a boolean' });
    }
    
    const { rows } = await db.raw(
      'UPDATE users SET is_admin = ? WHERE id = ? RETURNING id, username, is_admin',
      [is_admin, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user_id: userId,
      username: rows[0].username,
      is_admin: rows[0].is_admin
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

adminRouter.put('/users/:id/suspend', async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_suspended } = req.body;
    
    // Validate input
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (typeof is_suspended !== 'boolean') {
      return res.status(400).json({ error: 'is_suspended must be a boolean' });
    }
    
    const { rows } = await db.raw(
      'UPDATE users SET is_suspended = ? WHERE id = ? RETURNING id, username, is_suspended',
      [is_suspended, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user_id: userId,
      username: rows[0].username,
      is_suspended: rows[0].is_suspended
    });
  } catch (error) {
    console.error('Error updating user suspension status:', error);
    res.status(500).json({ error: 'Failed to update user suspension status' });
  }
});

adminRouter.post('/users/:id/reset-claims', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const { rows } = await db.raw(
      'UPDATE users SET last_claimed = NULL WHERE id = ? RETURNING id, username',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user_id: userId,
      username: rows[0].username,
      message: 'User claims reset successfully'
    });
  } catch (error) {
    console.error('Error resetting user claims:', error);
    res.status(500).json({ error: 'Failed to reset user claims' });
  }
});

// Admin endpoint for manual event resolution
adminRouter.post('/events/:id/resolve-manual', async (req, res) => {
  const { correct_answer, final_price } = req.body;
  const eventId = req.params.id;

  try {
    // Validate input
    if (!correct_answer) {
      return res.status(400).json({ error: 'correct_answer is required' });
    }

    const validAnswers = ['Higher', 'Lower', '0-3% up', '3-5% up', '5%+ up', '0-3% down', '3-5% down', '5%+ down'];
    if (!validAnswers.includes(correct_answer)) {
      return res.status(400).json({
        error: 'Invalid correct_answer. Must be one of: ' + validAnswers.join(', ')
      });
    }

    if (final_price && (typeof final_price !== 'number' || final_price <= 0)) {
      return res.status(400).json({ error: 'final_price must be a positive number if provided' });
    }

    const trx = await db.transaction(); // Start transaction
    try {
      const result = await manualResolveEvent(trx, eventId, correct_answer, final_price);
      await trx.commit(); // Commit transaction
      res.json({ success: true, data: result });
    } catch (transactionError) {
      await trx.rollback(); // Rollback on error
      throw transactionError;
    }

  } catch (error) {
    console.error('Manual resolution error:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- ADD THIS ENTIRE BLOCK ---

// Admin endpoint to suspend or unsuspend an event
adminRouter.post('/events/:id/suspend', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { is_suspended } = req.body;

    // Validate input
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    if (typeof is_suspended !== 'boolean') {
      return res.status(400).json({ error: 'is_suspended must be a boolean value' });
    }

    // Update the event's status and is_suspended flag in the database
    const { rows } = await db.raw(
      `UPDATE events
       SET is_suspended = ?, status = ?
       WHERE id = ?
       RETURNING id, title, is_suspended, status`,
      [is_suspended, is_suspended ? 'suspended' : 'active', eventId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const message = is_suspended ? 'Event suspended successfully' : 'Event unsuspended successfully';
    res.json({
      success: true,
      message: message,
      event: rows[0]
    });

  } catch (error) {
    console.error('Error updating event suspension status:', error);
    res.status(500).json({ error: 'Failed to update event suspension status' });
  }
});

// --- END OF BLOCK TO ADD ---

// --- ADD THIS ENTIRE BLOCK ---

// Admin endpoint to delete an event and its associated participants
adminRouter.delete('/events/:id', async (req, res) => {
  const eventId = req.params.id;

  // Validate input
  if (!eventId || isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const trx = await db.transaction();

  try {
    // Step 1: Delete associated participants first to avoid foreign key violations.
    await trx.raw('DELETE FROM participants WHERE event_id = ?', [eventId]);
    
    // NOTE: If other tables like 'event_outcomes' or 'audit_logs' also reference 'events',
    // you would add similar DELETE statements for them here.

    // Step 2: Delete the event itself.
    const result = await trx.raw('DELETE FROM events WHERE id = ?', [eventId]);

    if (result.rowCount === 0) {
      // If the event didn't exist, no harm done, but we should rollback and inform the user.
      await trx.rollback();
      return res.status(404).json({ error: 'Event not found' });
    }

    // Step 3: If both deletions were successful, commit the transaction.
    await trx.commit();
    
    res.json({
      success: true,
      message: 'Event and all its participants deleted successfully'
    });

  } catch (error) {
    // If any step fails, roll back the entire transaction.
    await trx.rollback();
    console.error('Error deleting event with transaction:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// --- END OF BLOCK TO ADD ---
// Admin endpoint to transfer platform fees to a user
adminRouter.post('/platform-fees/transfer', async (req, res) => {
  const { userId, amount, reason } = req.body;
  
  // Validate input
  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  
  const trx = await db.transaction();
  try {
    // Get total platform fees
    const totalFeesResult = await trx.raw('SELECT COALESCE(SUM(platform_fee), 0) as total_fees FROM events');
    const totalFees = parseInt(totalFeesResult.rows[0].total_fees) || 0;
    
    if (amount > totalFees) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient platform fees',
        available: totalFees
      });
    }
    
    // Check if user exists
    const userResult = await trx.raw('SELECT id, username, points FROM users WHERE id = ?', [userId]);
    if (userResult.rows.length === 0) {
      await trx.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const userBeforePoints = user.points;
    
    // Transfer points to user using centralized function
    const newBalance = await updateUserPoints(client, userId, amount, 'platform_fee_transfer', null);
    
    // Log the transfer in audit_logs
    await trx.raw(
      `INSERT INTO audit_logs (action, details) VALUES ('platform_fee_transfer', ?)`,
      [JSON.stringify({
        admin_id: req.userId || 'unknown',
        user_id: userId,
        user_username: user.username,
        amount: amount,
        reason: reason || 'Admin transfer',
        user_points_before: userBeforePoints,
        user_points_after: userBeforePoints + amount,
        timestamp: new Date().toISOString()
      })]
    );
    
    await trx.commit();
    
    res.json({
      success: true,
      amount_transferred: amount,
      user_id: userId,
      user_username: user.username,
      user_points_before: userBeforePoints,
      user_points_after: userBeforePoints + amount
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error transferring platform fees:', error);
    res.status(500).json({ error: 'Failed to transfer platform fees' });
  }
});

/**
 * @api {get} /api/admin/metrics Get platform metrics
 * @apiName GetMetrics
 * @apiGroup Admin
 * @apiHeader {String} Authorization Admin access token
 *
 * @apiSuccess {Number} totalEvents Total number of events
 * @apiSuccess {Number} activeEvents Number of active events (unresolved)
 * @apiSuccess {Number} completedEvents Number of completed events
 * @apiSuccess {Number} totalFees Total platform fees collected
 */
adminRouter.get('/metrics', async (req, res) => {
  try {
    const totalEventsQuery = await db.raw('SELECT COUNT(*) FROM events');
    const activeEventsQuery = await db.raw(
      'SELECT COUNT(*) FROM events WHERE resolution_status = ?',
      ['pending']
    );
    const completedEventsQuery = await db.raw(
      'SELECT COUNT(*) FROM events WHERE resolution_status = ?',
      ['resolved']
    );
    const totalFeesQuery = await db.raw(
      'SELECT COALESCE(SUM(platform_fee), 0) FROM events'
    );
    const pendingEventsQuery = await db.raw(
      'SELECT COUNT(*) FROM events WHERE resolution_status = ? AND end_time < NOW()',
      ['pending']
    );

    res.json({
      totalEvents: parseInt(totalEventsQuery.rows[0].count),
      activeEvents: parseInt(activeEventsQuery.rows[0].count),
      completedEvents: parseInt(completedEventsQuery.rows[0].count),
      totalFees: parseInt(totalFeesQuery.rows[0].coalesce),
      pendingEvents: parseInt(pendingEventsQuery.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    // Test database connection
    await db.raw('SELECT 1');
    console.log("Database connection successful");
    
    // Try to start the server on the specified port or an alternative port
    const server = await startServerOnAvailablePort();
        
    // Create WebSocket server
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
    });
    
    // Broadcast participation updates
    function broadcastParticipation(eventId) {
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'participationUpdate', eventId }));
        }
      });
    }
    
    // Add broadcast to bet placement endpoint
    
    // Create initial event after server has started
    await createInitialEvent();
    
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

app.use((err, req, res, next) => {
    console.error('💥 Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    console.log('404 - Endpoint not found:', req.method, req.originalUrl);
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      availableRoutes: [
        '/api/health',
        '/api/events/active',
        '/api/events',
        '/api/auth/register',
        '/api/auth/login',
        '/api/admin/events/create',
        '/api/admin/events/status',
        '/api/admin/platform-fees/total',
        '/api/admin/platform-fees/transfer'
      ]
    });
});

process.on('SIGINT', () => {
    console.log("\nShutting down server...");
    db.destroy(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
    });
});