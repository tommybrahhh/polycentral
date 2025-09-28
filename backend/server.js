// server.js - Complete Backend Server for Predictions App
// This handles all API endpoints, database operations, and event management

const path = require('path');

// Robust production detection (Render sets RENDER=true, Railway sets RAILWAY_ENVIRONMENT_NAME=production)
const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

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
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const coingecko = require('./lib/coingecko');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8080;

// --- Middleware Setup ---
app.use(helmet());
// Set allowed origins for CORS - include both your frontend domains
const raw = process.env.CORS_ORIGIN || 'https://polyc-e9xss6xg8-tommybrahhhs-projects.vercel.app,https://polyc-seven.vercel.app,http://localhost:5173';
const allowedOrigins = raw.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in our allowed list
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.error(`CORS ERROR: ${msg}. Allowed origins: ${allowedOrigins.join(', ')}`);
            return callback(new Error(msg), false);
        }
        
        // Origin is allowed
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

// --- Database Setup ---
const fs = require('fs').promises;
let pool;

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  
  // Try to connect with the main DATABASE_URL first
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Add error handling for connection issues
  pool.on('error', async (err) => {
    console.error('PostgreSQL connection error:', err);
    
    // If connection fails, try with the public URL
    if (process.env.DATABASE_PUBLIC_URL && err.code === 'ECONNREFUSED') {
      console.log('Trying to connect with public database URL...');
      pool = new Pool({ connectionString: process.env.DATABASE_PUBLIC_URL });
    }
  });
  
  console.log('💾 PostgreSQL database connected');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(':memory:'); // Use in-memory database for testing

  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // SQLite uses '?' instead of '$1, $2', so we convert them
        const sqliteQuery = text.replace(/\$\d+/g, '?');
        db.all(sqliteQuery, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    },
    // Add a mock .connect() method to support transactions in SQLite
    connect: () => Promise.resolve({
        query: async (text, params) => {
            if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
            return pool.query(text, params);
        },
        release: () => {}
    })
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

    // Ensure participants table has correct column names
    await ensureParticipantsTableIntegrity();

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

// Ensure participants table has the correct column structure
async function ensureParticipantsTableIntegrity() {
  const dbType = getDatabaseType();
  try {
    console.log('🔧 Checking participants table column integrity...');
    
    // Query to check column names - different for PostgreSQL and SQLite
    let columnsQuery;
    if (dbType === 'postgres') {
      columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'participants' 
        AND column_name IN ('amount', 'points_paid')
      `;
    } else {
      // SQLite
      columnsQuery = `
        PRAGMA table_info(participants)
      `;
    }
    
    const result = await pool.query(columnsQuery);
    const columns = dbType === 'postgres' 
      ? result.rows.map(row => row.column_name) 
      : result.rows.filter(row => ['amount', 'points_paid'].includes(row.name)).map(row => row.name);
    
    const hasAmount = columns.includes('amount');
    const hasPointsPaid = columns.includes('points_paid');
    
    if (hasAmount && !hasPointsPaid) {
      console.log('✅ Participants table has correct column: amount');
      return;
    }
    
    if (!hasAmount && hasPointsPaid) {
      // Rename points_paid to amount
      const renameQuery = dbType === 'postgres'
        ? 'ALTER TABLE participants RENAME COLUMN points_paid TO amount'
        : `
          CREATE TABLE participants_new AS SELECT id, event_id, user_id, prediction, points_paid as amount, created_at FROM participants;
          DROP TABLE participants;
          ALTER TABLE participants_new RENAME TO participants;
        `;
      
      await pool.query(renameQuery);
      console.log('✅ Renamed points_paid column to amount in participants table');
      return;
    }
    
    if (hasAmount && hasPointsPaid) {
      // Both columns exist, drop the old one
      const dropQuery = dbType === 'postgres'
        ? 'ALTER TABLE participants DROP COLUMN points_paid'
        : 'ALTER TABLE participants DROP COLUMN points_paid'; // SQLite 3.35.0+ supports DROP COLUMN
      
      try {
        await pool.query(dropQuery);
        console.log('✅ Removed deprecated points_paid column from participants table');
      } catch (error) {
        console.warn('⚠️ Could not drop points_paid column, may need manual cleanup:', error.message);
      }
      return;
    }
    
    // Neither column exists - create amount column
    const addColumnQuery = dbType === 'postgres'
      ? 'ALTER TABLE participants ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 0'
      : 'ALTER TABLE participants ADD COLUMN amount INTEGER NOT NULL DEFAULT 0';
    
    await pool.query(addColumnQuery);
    console.log('✅ Added amount column to participants table');
    
  } catch (error) {
    console.error('❌ Error checking participants table integrity:', error);
    // Don't throw - this is a best-effort fix, not critical to startup
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
          // For PostgreSQL, we need to handle CREATE INDEX CONCURRENTLY differently
          // as it cannot run inside a transaction block
          const statements = migrationSql.split(';').filter(stmt => stmt.trim());
          
          for (const stmt of statements) {
            const trimmedStmt = stmt.trim();
            
            // Check if this is a CREATE INDEX CONCURRENTLY command
            if (/^CREATE\s+INDEX\s+CONCURRENTLY/i.test(trimmedStmt)) {
              console.log(`Executing CREATE INDEX CONCURRENTLY command outside transaction: ${trimmedStmt.substring(0, 100)}...`);
              try {
                await pool.query(trimmedStmt);
                console.log(`✅ CREATE INDEX CONCURRENTLY executed successfully`);
              } catch (error) {
                if (!error.message.includes('already exists')) {
                  throw error;
                }
                console.warn(`Index already exists: ${error.message}`);
              }
            } else {
              // For all other statements, execute with transaction safety
              // This includes PL/pgSQL functions with $$ blocks
              await runMigrationSafe(trimmedStmt);
            }
          }
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
  const entryFee = 0; // Free participation for daily event

  // Generate formatted title with date and crypto symbol
  const eventDate = new Date().toISOString().split('T')[0];
  const title = `${process.env.CRYPTO_ID || 'bitcoin'} Price Prediction ${eventDate}`;
  
  // Look up event type 'prediction'
  const typeQuery = await pool.query(`SELECT id FROM event_types WHERE name = 'prediction'`);
  if (typeQuery.rows.length === 0) {
    throw new Error("Event type 'prediction' not found");
  }
  const eventTypeId = typeQuery.rows[0].id;

  await pool.query(
    `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time, location, event_type_id, status, resolution_status, entry_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'pending', $8, true)`,
    [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime, 'Global', eventTypeId, entryFee]
  );
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
        
        // Determine outcome based on price comparison
        const outcome = finalPrice > event.initial_price ? 'Higher' : 'Lower';
        
        // Award points to winners
        const result = await pool.query(
          `UPDATE users SET points = points + (
             SELECT entry_fee FROM events WHERE id = $1
           )
           WHERE id IN (
             SELECT user_id FROM participants
             WHERE event_id = $1 AND prediction = $2
           )`,
          [event.id, outcome]
        );
        
        console.log(`Awarded points to ${result.rowCount} winners for event ${event.id}`);
      } catch (error) {
        // --- START OF NEW, MORE DETAILED LOGGING ---
        if (error.response) {
            // This means the CoinGecko server responded with an error (like 429)
            console.error(`Failed to resolve event ${event.id}. API Error: Status ${error.response.status} - ${error.response.statusText}. Data:`, error.response.data);
            // We'll skip this event for now and let the cron job try again later.
        } else {
            // This is for other errors, like a network failure
            console.error(`Failed to resolve event ${event.id} with a non-API error:`, error.message);
        }
        // --- END OF NEW LOGGING ---
      }
    }
  } catch (error) {
    console.error('Error in resolvePendingEvents:', error);
  }
}



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
app.get('/', (req, res) => res.json({ status: 'OK' }));

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
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR email = $2',
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
      `INSERT INTO users (username, email, password_hash, last_login_date) VALUES (LOWER($1), $2, $3, NOW()) RETURNING id, username, email, points`,
      [username, email, passwordHash]
    );
    // Ensure username is returned in original case for the response
    newUser.username = username;
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
        // Update last login date on successful login
        await pool.query('UPDATE users SET last_login_date = NOW() WHERE id = $1', [user.id]);
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
    const { prediction } = req.body;
    const userId = req.userId;
    
    // Validate prediction - updated to use "Higher" and "Lower" options
    if (prediction !== 'Higher' && prediction !== 'Lower') {
        return res.status(400).json({ error: 'Prediction must be "Higher" or "Lower"' });
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
// Claim free points endpoint
app.post('/api/user/claim-free-points', authenticateToken, async (req, res) => {
  try {
    // Check if user has already claimed points today
    const { rows: claimCheck } = await pool.query(
      `SELECT last_claimed, last_login_date FROM users WHERE id = $1`,
      [req.userId]
    );

    if (claimCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const lastClaimed = claimCheck[0].last_claimed;
    const now = new Date();
    
    // Check if user has claimed within the last 24 hours
    if (lastClaimed) {
      const hoursSinceLastClaim = (now - new Date(lastClaimed)) / (1000 * 60 * 60);
      if (hoursSinceLastClaim < 24) {
        return res.status(400).json({
          error: 'You can only claim free points once every 24 hours',
          hoursRemaining: Math.ceil(24 - hoursSinceLastClaim)
        });
      }
    }

    // For SQLite, we can't use client.query('BEGIN')/('COMMIT')/('ROLLBACK')
    // Instead, we'll use the pool.query directly since our SQLite pool mock handles transactions
    if (dbType === 'postgres') {
      // Use transaction for PostgreSQL
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Award 250 points to the user
        const pointsToAward = 250;
        const { rows: [updatedUser] } = await client.query(
          `UPDATE users
           SET points = points + $1, last_claimed = NOW(), last_login_date = NOW()
           WHERE id = $2
           RETURNING id, username, points`,
          [pointsToAward, req.userId]
        );

        await client.query('COMMIT');
        
        res.json({
          message: 'Successfully claimed free points!',
          points: pointsToAward,
          newTotal: updatedUser.points
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // For SQLite, use direct query (our SQLite mock handles the transaction internally)
      const pointsToAward = 250;
      const { rows: [updatedUser] } = await pool.query(
        `UPDATE users
         SET points = points + $1, last_claimed = NOW(), last_login_date = NOW()
         WHERE id = $2
         RETURNING id, username, points`,
        [pointsToAward, req.userId]
      );
      
      res.json({
        message: 'Successfully claimed free points!',
        points: pointsToAward,
        newTotal: updatedUser.points
      });
    }
  } catch (error) {
    console.error('Error claiming free points:', error);
    res.status(500).json({ error: 'Failed to claim points' });
  }
});

// GET user prediction history
app.get('/api/user/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.initial_price,
         e.final_price,
         e.resolution_status,
         e.start_time,
         e.end_time,
         p.prediction,
         CASE
           WHEN e.resolution_status = 'resolved' THEN
             CASE
               WHEN (e.final_price > e.initial_price AND p.prediction = 'Higher') OR (e.final_price < e.initial_price AND p.prediction = 'Lower') THEN 'win'
               ELSE 'loss'
             END
           ELSE 'pending'
         END as result,
         e.entry_fee
       FROM participants p
       JOIN events e ON p.event_id = e.id
       WHERE p.user_id = $1
       ORDER BY e.start_time DESC`,
      [userId]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching user prediction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET active events
app.get('/api/events/active', async (req, res) => {
  try {
    console.log('Fetching active events...');
    // Query active events with initial price
    const { rows } = await pool.query(
      `SELECT
        id,
        title,
        description,
        options,
        entry_fee,
        start_time,
        end_time,
        initial_price,
        final_price,
        correct_answer,
        resolution_status,
        (SELECT COUNT(*) FROM participants WHERE event_id = events.id) AS current_participants,
        (SELECT entry_fee * COUNT(*) FROM participants WHERE event_id = events.id) AS prize_pool
      FROM events
      WHERE status = 'active' OR resolution_status = 'pending'`
    );

    // Calculate time remaining and format response
    const now = new Date();
    const activeEvents = rows.map(event => {
      const endTime = new Date(event.end_time);
      const timeRemaining = Math.floor((endTime - now) / 1000); // seconds
      const isExpired = timeRemaining <= 0;
      
      return {
        ...event,
        end_time: endTime.toISOString(),
        time_remaining: isExpired ? 0 : timeRemaining,
        status: isExpired && event.status === 'active' ? 'expired' : event.status
      };
    });

    res.json(activeEvents);
  } catch (error) {
    console.error('❌ Error fetching active events:', error);
    res.status(500).json({
      error: 'Internal server error while fetching active events',
      details: error.message
    });
  }
});
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

cron.schedule('* * * * *', async () => { /* ... */ });

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
        '/api/auth/login'
      ]
    });
});

// --- Initial Event Creation Function ---
async function createInitialEvent() {
  try {
    const query = dbType === 'postgres'
      ? "SELECT 1 FROM events WHERE start_time > NOW() - INTERVAL '1 day' LIMIT 1"
      : "SELECT 1 FROM events WHERE start_time > datetime('now', '-1 day') LIMIT 1";
    const existing = await pool.query(query);
    if (existing.rows.length === 0) {
      const price = await coingecko.getCurrentPrice(process.env.CRYPTO_ID || 'bitcoin');
      await createEvent(price);
    }
  } catch (error) {
    console.error('Initial event creation failed:', error);
  }
}

// --- Daily Event Creation Function ---
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

// Schedule cron jobs
cron.schedule('0 0 * * *', createDailyEvent);
cron.schedule('0 * * * *', resolvePendingEvents); // This means "at minute 0 of every hour"


// --- Admin Manual Event Creation Endpoint ---
// This endpoint allows admin to manually trigger event creation
app.post('/api/admin/events/create', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin manually triggering event creation...');
    await createDailyEvent();
    res.json({ success: true, message: "Event creation triggered successfully" });
  } catch (error) {
    console.error('Admin event creation failed:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server listening on port ${PORT}`);
      console.log(`Environment variables:`, {
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        RENDER: process.env.RENDER,
        DB_TYPE: process.env.DB_TYPE,
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set'
      });
      console.log('✅ Server started successfully');
    });
    
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

    server.on('error', (error) => {
        console.error('❌ Server error:', error);
        if (error.code === 'EADDRINUSE') {
            console.log(`Port ${PORT} is already in use. Trying alternative port...`);
            // Try alternative ports
            const alternativePorts = [8080, 8000, 5000];
            for (const altPort of alternativePorts) {
                console.log(`Trying port ${altPort}...`);
                try {
                    server.listen(altPort);
                    break;
                } catch (err) {
                    if (err.code !== 'EADDRINUSE') {
                        console.error('Unexpected error:', err);
                        break;
                    }
                }
            }
        }
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