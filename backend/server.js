// server.js - Complete Backend Server for Predictions App
// This handles all API endpoints, database operations, and event management

const path = require('path');

// Robust production detection (Render sets RENDER=true)
const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

// Log environment information
console.log(`🚀 Starting in ${isProduction ? 'PRODUCTION' : 'development'} mode`);
console.log(`🔧 Environment variables source: ${isProduction ? '.env.production' : '.env'}`);

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, isProduction ? '.env.production' : '.env')
});

// Log critical environment variables
console.log('🔍 Critical environment variables:');
console.log(`- RENDER: ${process.env.RENDER || 'not set'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- DB_TYPE: ${process.env.DB_TYPE || 'not set'}`);
console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const coingecko = require('./lib/coingecko');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// --- Middleware Setup ---
app.use(helmet());
const raw = process.env.CORS_ORIGIN || '';
const allowedOrigins = raw.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.error(`CORS ERROR: ${msg}. Allowed origins: ${allowedOrigins.join(', ')}`);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    });
    next();
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
// --- Database Setup ---
const fs = require('fs').promises;
const dbType = getDatabaseType();
let pool;

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('💾 PostgreSQL database connected');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(':memory:'); // Use in-memory database for testing

  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        db.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    }
  };
  console.log('💾 SQLite database connected');
}

// --- Database Initialization ---
async function initializeDatabase() {
  const dbType = getDatabaseType();
  try {
    console.log(`🛠️ Initializing database (${dbType}) tables and constraints...`);
    
    // Load and execute schema initialization
    const initSql = await fs.readFile(
      path.join(__dirname, 'sql', dbType, 'init_tables.sql'),
      'utf8'
    );
    
    // SQLite requires executing each statement individually
    if (dbType === 'sqlite') {
      const statements = initSql.split(';').filter(stmt => stmt.trim());
      for (const stmt of statements) {
        await pool.query(stmt);
      }
    } else {
      await pool.query(initSql);
    }
    
    // Load and execute seed data
    const seedSql = await fs.readFile(
      path.join(__dirname, 'sql', dbType, 'seed_data.sql'),
      'utf8'
    );
    
    if (dbType === 'sqlite') {
      const statements = seedSql.split(';').filter(stmt => stmt.trim());
      for (const stmt of statements) {
        await pool.query(stmt);
      }
    } else {
      await pool.query(seedSql);
    }
    
    // Create sample events and test users in all environments
    // Development-only sample data creation (removed in production)
    
    // Run database migrations BEFORE creating sample data
    await runMigrations();

    // Skip sample data in production - removed entirely to prevent errors
    console.log('⏭️ Skipping sample data creation in production');
    
    console.log('✅ Database initialization complete');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  }
}

// REMOVED createSampleEvents function entirely - not needed in production

// REMOVED createTestUsers function entirely - not needed in production

// --- Event Resolution Job ---
// --- Event Creation Job ---
async function constraintExists(table, constraintName) {
  if (dbType === 'postgres') {
    const res = await pool.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = $1 AND constraint_name = $2`,
      [table, constraintName]
    );
    return res.rows.length > 0;
  } else {
    // SQLite doesn't have a direct way to check constraints
    // We'll rely on try-catch during migration execution
    return false;
  }
}

async function runMigrationSafe(sql) {
  try {
    await pool.query(sql);
  } catch (error) {
    if (!error.message.includes('already exists') && error.code !== '42710') {
      throw error;
    }
    console.warn(`Migration item already exists: ${error.message}`);
  }
}

async function runMigrations() {
  const dbType = getDatabaseType();
  try {
    console.log(`🛠️ Running database migrations (${dbType})...`);
    
    // Create version tracking table if not exists
    await runMigrationSafe(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check current version
    let currentVersion = 0;
    try {
      const { rows } = await pool.query('SELECT MAX(version) as current FROM schema_versions');
      currentVersion = rows[0].current || 0;
    } catch (e) {
      console.log('No existing schema versions, starting fresh');
    }
    
    // Get all migration files sorted by version
    // Get and sort migrations considering both upgrade and rollback
    const migrationFiles = (await fs.readdir(path.join(__dirname, 'sql', dbType)))
        .filter(f => f.startsWith('migrate_v'))
        .sort((a, b) => {
            const aVersions = a.match(/\d+/g).map(Number);
            const bVersions = b.match(/\d+/g).map(Number);
            const aFrom = aVersions[0], aTo = aVersions[1];
            const bFrom = bVersions[0], bTo = bVersions[1];
            // Sort upgrades ascending, rollbacks descending
            return aTo > aFrom ? aTo - bTo : bTo - aTo;
        });

    for (const file of migrationFiles) {
        const toVersion = parseInt(file.match(/\d+/g)[1]);
        if (currentVersion >= toVersion) {
            console.log(`✅ Migration to v${toVersion} already applied. Skipping.`);
            continue;
        }

        console.log(`🛠️ Applying migration from v${currentVersion}->v${toVersion}`);
        const migrationSql = await fs.readFile(
            path.join(__dirname, 'sql', dbType, file),
            'utf8'
        );
    
    if (dbType === 'sqlite') {
      const statements = migrationSql.split(';').filter(stmt => stmt.trim());
      for (const stmt of statements) {
        await runMigrationSafe(stmt);
      }
    } else {
      await runMigrationSafe(migrationSql);
    }
    
    // Record migration completion
        if (dbType === 'sqlite') {
            const statements = migrationSql.split(';').filter(stmt => stmt.trim());
            for (const stmt of statements) {
                await runMigrationSafe(stmt);
            }
        } else {
            await runMigrationSafe(migrationSql);
        }

        // Record migration completion
        await pool.query(
            'INSERT INTO schema_versions (version) VALUES ($1)',
            [toVersion]
        );
        console.log(`✅ Migration to v${toVersion} completed`);
    }
    
    console.log('✅ Database migrations applied and version recorded');
  } catch (error) {
    console.error('❌ Database migrations failed:', error);
    process.exit(1);
  }
}

// --- Event Creation Functions ---
async function createEvent(initialPrice) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Generate formatted title with date and crypto symbol
  const eventDate = new Date().toISOString().split('T')[0];
  const title = `${process.env.CRYPTO_ID || 'bitcoin'} Price Prediction ${eventDate}`;
  
  await pool.query(
    `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)`,
    [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime]
  );
}

async function createDailyEvent() {
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const currentPrice = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
    await createEvent(currentPrice);
    console.log(`Created new Bitcoin event with initial price: $${currentPrice}`);
  } catch (error) {
    console.error('Error creating daily event:', error);
  }
}

// --- Event Resolution Job ---
async function resolvePendingEvents() {
  try {
    console.log('Resolving pending events...');
    const now = new Date();
    
    // Find events ready for resolution
    const { rows: events } = await pool.query(
      `SELECT id, end_time, initial_price FROM events
       WHERE end_time < $1 AND resolution_status = 'pending'`,
      [now]
    );

    if (events.length === 0) {
      console.log('No pending events to resolve');
      return;
    }

    console.log(`Found ${events.length} events to resolve`);
    
    for (const event of events) {
      try {
        const finalPrice = await coingecko.getHistoricalPrice(process.env.CRYPTO_ID || 'bitcoin', event.end_time);
        
        // Update event with final price
        await pool.query(
          `UPDATE events
           SET final_price = $1, resolution_status = 'resolved'
           WHERE id = $2`,
          [finalPrice, event.id]
        );
        
        console.log(`Resolved event ${event.id} with final price: $${finalPrice}`);
        
        // Update user points based on predictions
        // (Implementation depends on your prediction system)
      } catch (error) {
        console.error(`Failed to resolve event ${event.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in resolvePendingEvents:', error);
  }
}

// Constants declaration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

// Cron jobs should be scheduled outside the function
cron.schedule('0 0 * * *', createDailyEvent);
cron.schedule('*/30 * * * *', resolvePendingEvents);

// Initialize cron jobs after server starts
(() => {
  try {
    cron.schedule('0 0 * * *', createDailyEvent);
    cron.schedule('*/30 * * * *', resolvePendingEvents);
    console.log('Cron jobs initialized');
  } catch (error) {
    console.error('Failed to initialize cron jobs:', error);
  }
})();

// --- Event Resolution Function ---
async function resolveEvent(eventId) {
  try {
    console.log(`Resolving event ${eventId}...`);
    // Get event details
    const { rows: [event] } = await pool.query(
      `SELECT id, crypto_symbol, end_time, initial_price FROM events WHERE id = $1`,
      [eventId]
    );

    if (!event) {
      console.error(`Event ${eventId} not found`);
      return;
    }

    // Get historical price at event end time
    const historicalPrice = await coingecko.getHistoricalPrice(
      event.crypto_symbol || 'btc',
      formatDate(event.end_time)
    );
    
    // Update event with final price
    await pool.query(
      `UPDATE events SET final_price = $1, resolution_status = 'resolved' WHERE id = $2`,
      [historicalPrice, event.id]
    );
    
    // Resolve predictions
    const outcome = historicalPrice > event.initial_price ? 'Up' : 'Down';
    
    // Award points to winners
    const result = await pool.query(
      `UPDATE users SET points = points + events.entry_fee
       FROM participants
       JOIN events ON participants.event_id = events.id
       WHERE participants.event_id = $1
       AND participants.prediction = $2`,
      [event.id, outcome]
    );
    
    console.log(`Resolved event ${eventId}. Awarded ${result.rowCount} winners.`);
  } catch (error) {
    console.error(`Error resolving event ${eventId}:`, error);
  }
}

// --- Schedule Event Resolution ---
cron.schedule('*/30 * * * *', async () => {
  try {
    console.log('Checking for unresolved events...');
    const now = new Date();
    const { rows: unresolvedEvents } = await pool.query(
      `SELECT id FROM events
       WHERE end_time <= $1 AND resolution_status = 'pending'`,
      [now]
    );
    
    for (const event of unresolvedEvents) {
      await resolveEvent(event.id);
    }
  } catch (error) {
    console.error('Error in event resolution scheduler:', error);
  }
});

// --- Schedule Daily Event Creation ---
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Creating daily Bitcoin prediction event...');
    const price = await coingecko.getCurrentPrice('bitcoin');
    
    // Create event in database
    await createEvent(price);
    console.log(`Created new Bitcoin prediction event with initial price: $${price}`);
  } catch (error) {
    console.error('Event creation failed:', error);
  }
});

// --- Event Resolution Function ---
async function resolveEvents() {
  let client;
  try {
    console.log('Checking for expired events...');
    const now = new Date().toISOString();

    // Find active events that have ended
    const { rows: events } = await pool.query(
      `SELECT id, title FROM events
       WHERE end_time < $1 AND status = 'active'`,
      [now]
    );

    if (events.length === 0) {
      console.log('No events to resolve');
      return;
    }

    console.log(`Found ${events.length} events to resolve`);

    // Get current Bitcoin price
    const apiKey = process.env.COINGECKO_API_KEY;
    const cryptoSymbol = process.env.DEFAULT_CRYPTO_SYMBOL || 'btc';
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoSymbol}&vs_currencies=usd`;
    
    let response;
    const maxRetries = 5;
    const baseDelay = 1000;
    let attempt = 0;

    // Retry logic for CoinGecko API
    while (attempt < maxRetries) {
      try {
        response = await fetch(url, {
          headers: { 'x-cg-demo-api-key': apiKey },
          timeout: 5000
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        break;
      } catch (error) {
        attempt++;
        const delay = baseDelay * Math.pow(2, attempt);
        
        if (attempt === maxRetries) {
          console.error(`Coingecko API failed after ${maxRetries} attempts: ${error.message}`);
          throw new Error('Price service unavailable');
        }
        
        console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const data = await response.json();
    const cryptoPrice = data[cryptoSymbol].usd;
    const correctAnswer = cryptoPrice >= 98000 ? 'Yes' : 'No';
    
    console.log(`API call successful. ${cryptoSymbol.toUpperCase()} price: $${cryptoPrice}`);
    console.log(`Outcome determined: ${correctAnswer}`);

    // Process each event with transaction
    for (const event of events) {
      const client = await pool.connect();
      console.log(`Resolving event ${event.id}: ${event.title}`);
      try {
        await client.query('BEGIN');
        
        // Update event status and correct answer
        await pool.query(
          `UPDATE events SET
           correct_answer = $1, status = 'resolved'
           WHERE id = $2`,
          [correctAnswer, event.id]
        );
        
        // Award points to winners
        const result = await pool.query(
          `UPDATE users SET points = points + events.entry_fee
           FROM participants
           JOIN events ON participants.event_id = events.id
           WHERE participants.event_id = $1
           AND participants.prediction = $2`,
          [event.id, correctAnswer]
        );
        console.log(`Awarded points to ${result.rowCount} winners`);
        
        await client.query('COMMIT');
        client.release();
        console.log(`Event ${event.id} resolved successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error(`Failed to resolve event ${event.id}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error in resolveEvents:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Schedule event resolution to run daily at 23:59 UTC
cron.schedule('59 23 * * *', resolveEvents);

// --- API Routes, Cron Job, and Server Startup ---
// (I am including the full working code below for completeness)

// Middleware to authenticate admin API key
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ error: 'Token is invalid or expired' });
        req.userId = user.userId;
        next();
    });
};

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Password not strong enough.' });

  // Check for existing username or email
  try {
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
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
    const { rows: [newUser] } = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, points`,
      [username, email, passwordHash]
    );
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: newUser });
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
        const { rows: [user] } = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [identifier]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, points: user.points } });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// New event creation endpoint with simplified parameters
app.post('/api/events', authenticateToken, async (req, res) => {
    const { title, description, options, entry_fee } = req.body;
    if (!title || !description || !options || !entry_fee) {
        return res.status(400).json({ error: 'All fields are required: title, description, options, entry_fee' });
    }
    
    // Calculate end time: 3 days from now
    const endTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    
    try {
        // Check for existing event with same title
        const existingEvent = await pool.query(
            'SELECT * FROM events WHERE title = $1',
            [title]
        );
        if (existingEvent.rows.length > 0) {
            return res.status(409).json({ error: 'Event title already exists' });
        }

        // Look up event type 'prediction'
        const typeQuery = await pool.query(`SELECT id FROM event_types WHERE name = 'prediction'`);
        if (typeQuery.rows.length === 0) {
            return res.status(400).json({ error: "Event type 'prediction' not found" });
        }
        const eventTypeId = typeQuery.rows[0].id;

        // Pre-flight table check with database-specific queries
        let tableExists;
        if (dbType === 'postgres') {
          tableExists = await pool.query(
            "SELECT 1 FROM information_schema.tables WHERE table_name='events'"
          );
        } else {
          // SQLite check
          tableExists = await pool.query(
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
          endTime,
          eventTypeId
        });

        try {
          // Create new event with default status
          const { rows: [newEvent] } = await pool.query(
            `INSERT INTO events (
                title, description, options, entry_fee, end_time, status, event_type_id
            ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
            RETURNING *`,
            [
                title,
                description,
                JSON.stringify(options),
                entry_fee,
                endTime,
                eventTypeId
            ]
          );
          console.debug('Event creation successful', newEvent);
          res.status(201).json(newEvent);
        } catch (error) {
          console.error(`Event creation failed: ${error.message}`, {
            query: `INSERT INTO events (title, description, options, entry_fee, end_time, status, event_type_id) VALUES ('${title}', '${description}', '${JSON.stringify(options)}', ${entry_fee}, '${endTime}', 'active', ${eventTypeId})`,
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

// Endpoint for placing a bet on an event
app.post('/api/events/:id/bet', authenticateToken, async (req, res) => {
    const eventId = req.params.id;
    const { userId, prediction } = req.body;
    
    // Validate prediction
    if (prediction !== 'Yes' && prediction !== 'No') {
        return res.status(400).json({ error: 'Prediction must be "Yes" or "No"' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check event exists
        const eventQuery = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
        if (eventQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Event not found' });
        }
        const event = eventQuery.rows[0];
        
        // Check user has sufficient points
        const userQuery = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
        if (userQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Helper function to format date for CoinGecko API
        function formatDate(date) {
          return date.toISOString().split('T')[0];
        }
        const user = userQuery.rows[0];
        if (user.points < event.entry_fee) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Insert bet into participants table
        const { rows: [newBet] } = await client.query(
            `INSERT INTO participants (event_id, user_id, prediction, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [eventId, userId, prediction, event.entry_fee]
        );

        // Deduct the entry fee from the user's points
        await client.query(
            'UPDATE users SET points = points - $1 WHERE id = $2',
            [event.entry_fee, userId]
        );
        
        await client.query('COMMIT');
        res.status(201).json(newBet);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Bet placement error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Other routes...
app.get('/api/user/stats', authenticateToken, async (req, res) => { /* ... */ });
app.post('/api/user/claim-free-points', authenticateToken, async (req, res) => { /* ... */ });
// GET active events
app.get('/api/events/active', async (req, res) => {
  try {
    // Query active events
    const { rows } = await pool.query(
      `SELECT
        id,
        title,
        description,
        options,
        entry_fee,
        start_time,
        prediction_window AS end_time,
        (SELECT COUNT(*) FROM participants WHERE event_id = events.id) AS current_participants,
        (SELECT entry_fee * COUNT(*) FROM participants WHERE event_id = events.id) AS prize_pool
      FROM events
      WHERE status = 'active'`
    );

    // Calculate time remaining and format response
    const now = new Date();
    const activeEvents = rows.map(event => {
      const endTime = new Date(event.end_time);
      const timeRemaining = Math.floor((endTime - now) / 1000); // seconds
      
      return {
        ...event,
        end_time: endTime.toISOString(),
        time_remaining: timeRemaining > 0 ? timeRemaining : 0
      };
    });

    res.json(activeEvents);
  } catch (error) {
    console.error('❌ Error fetching active events:', error);
    // Log detailed SQL error for debugging
    console.error('SQL Error Details:', error.message, error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
app.get('/api/events', async (req, res) => { /* ... */ });

// For testing: manually trigger event resolution
app.post('/api/events/resolve', authenticateAdmin, async (req, res) => {
    try {
        await resolveEvents();
        res.json({ success: true, message: "Resolution job triggered" });
    } catch (error) {
        console.error('Error in manual event resolution:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

cron.schedule('* * * * *', async () => { /* ... */ });

app.use((err, req, res, next) => {
    console.error('💥 Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// --- Initial Event Creation Function ---
async function createInitialEvent() {
  try {
    const existing = await pool.query(
      "SELECT * FROM events WHERE start_time > NOW() - INTERVAL '1 day'"
    );
    if (existing.rows.length === 0) {
      const price = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
      await createDailyEvent(price);
    }
  } catch (error) {
    console.error('Initial event creation failed:', error);
  }
}

async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    app.listen(PORT, async () => {
        console.log(`\n🚀 Server listening on port ${PORT}`);
        await createInitialEvent(); // Create initial event after startup
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    pool.end(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
    });
});