// server.js - Complete Backend Server for Predictions App
// This handles all API endpoints, database operations, and event management

const path = require('path');

// Robust production detection (Render sets RENDER=true, Railway sets RAILWAY_ENVIRONMENT_NAME=production)
const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME === 'production';

// Log environment information
console.log("Starting in " + (isProduction ? 'PRODUCTION' : 'development') + " mode");
console.log("Environment variables source: " + (isProduction ? '.env.production' : '.env'));

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, isProduction ? '.env.production' : '.env')
});

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
// Set allowed origins for CORS
const raw = process.env.CORS_ORIGIN || 'https://polycentral-production.up.railway.app,https://polyc-seven.vercel.app,http://localhost:5173';
const allowedOrigins = raw.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
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
    // Log current schema version
    try {
      const { rows } = await pool.query('SELECT * FROM schema_versions ORDER BY applied_at DESC');
      console.log('Current schema versions:', rows);
    } catch (error) {
      console.log('schema_versions table does not exist yet');
    }
    
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

    // Ensure table integrity for all tables
    console.log('🔧 Ensuring table integrity for all tables...');
    await ensureUsersTableIntegrity();
    await ensureParticipantsTableIntegrity();
    await ensureEventsTableIntegrity();
    console.log('✅ Table integrity checks completed');
    
    // Apply new migrations if any
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

// Ensure users table has the correct column structure
async function ensureUsersTableIntegrity() {
  const dbType = getDatabaseType();
  try {
    console.log('🔧 Checking users table column integrity...');
    
    // Query to check column names - different for PostgreSQL and SQLite
    let columnsQuery;
    if (dbType === 'postgres') {
      columnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name IN ('last_claimed', 'last_claim_date')
      `;
    } else {
      // SQLite
      columnsQuery = `
        PRAGMA table_info(users)
      `;
    }
    
    const result = await pool.query(columnsQuery);
    const columns = dbType === 'postgres'
      ? result.rows.map(row => row.column_name)
      : result.rows.filter(row => ['last_claimed', 'last_claim_date'].includes(row.name)).map(row => row.name);
    
    const hasLastClaimed = columns.includes('last_claimed');
    const hasLastClaimDate = columns.includes('last_claim_date');
    
    if (hasLastClaimed && !hasLastClaimDate) {
      console.log('✅ Users table has correct column: last_claimed');
      return;
    }
    
    if (!hasLastClaimed && hasLastClaimDate) {
      // Rename last_claim_date to last_claimed
      const renameQuery = dbType === 'postgres'
        ? 'ALTER TABLE users RENAME COLUMN last_claim_date TO last_claimed'
        : `
          CREATE TABLE users_new AS SELECT id, email, username, password_hash, wallet_address, points, total_events, won_events, last_claim_date as last_claimed, last_login_date, created_at FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
        `;
      
      await pool.query(renameQuery);
      console.log('✅ Renamed last_claim_date column to last_claimed in users table');
      return;
    }
    
    if (hasLastClaimed && hasLastClaimDate) {
      // Both columns exist, migrate data and drop the old one
      if (dbType === 'postgres') {
        // Update last_claimed with data from last_claim_date where last_claimed is NULL
        await pool.query(
          `UPDATE users
           SET last_claimed = last_claim_date
           WHERE last_claimed IS NULL AND last_claim_date IS NOT NULL`
        );
        
        // Drop the old column
        await pool.query('ALTER TABLE users DROP COLUMN last_claim_date');
      } else {
        // For SQLite, we need to recreate the table
        await pool.query(`
          CREATE TABLE users_new AS
          SELECT id, email, username, password_hash, wallet_address, points, total_events, won_events,
                 COALESCE(last_claimed, last_claim_date) as last_claimed, last_login_date, created_at
          FROM users
        `);
        await pool.query('DROP TABLE users');
        await pool.query('ALTER TABLE users_new RENAME TO users');
      }
      console.log('✅ Migrated data from last_claim_date to last_claimed and removed old column');
      return;
    }
    
    // Neither column exists - create last_claimed column
    const addColumnQuery = dbType === 'postgres'
      ? 'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TIMESTAMP'
      : 'ALTER TABLE users ADD COLUMN last_claimed TEXT';
    
    await pool.query(addColumnQuery);
    console.log('✅ Added last_claimed column to users table');
    
  } catch (error) {
    console.error('❌ Error checking users table integrity:', error);
    // Don't throw - this is a best-effort fix, not critical to startup
  }
}

// Ensure events table has the correct column structure
async function ensureEventsTableIntegrity() {
  const dbType = getDatabaseType();
  try {
    console.log('🔧 Checking events table column integrity...');
    
    // Query to check column names - different for PostgreSQL and SQLite
    let columnsQuery;
    if (dbType === 'postgres') {
      columnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name IN ('crypto_symbol', 'cryptocurrency', 'total_bets')
      `;
    } else {
      // SQLite
      columnsQuery = `
        PRAGMA table_info(events)
      `;
    }
    
    const result = await pool.query(columnsQuery);
    const columns = dbType === 'postgres'
      ? result.rows.map(row => row.column_name)
      : result.rows.filter(row => ['crypto_symbol', 'cryptocurrency', 'total_bets'].includes(row.name)).map(row => row.name);
    
    const hasCryptoSymbol = columns.includes('crypto_symbol');
    const hasCryptocurrency = columns.includes('cryptocurrency');
    const hasTotalBets = columns.includes('total_bets');
    
    // Check and fix total_bets column
    if (!hasTotalBets) {
      const addTotalBetsQuery = dbType === 'postgres'
        ? 'ALTER TABLE events ADD COLUMN IF NOT EXISTS total_bets INTEGER NOT NULL DEFAULT 0'
        : 'ALTER TABLE events ADD COLUMN total_bets INTEGER NOT NULL DEFAULT 0';
      
      await pool.query(addTotalBetsQuery);
      console.log('✅ Added total_bets column to events table');
    }
    
    if (hasCryptoSymbol && !hasCryptocurrency) {
      console.log('✅ Events table has correct column: crypto_symbol');
      return;
    }
    
    if (!hasCryptoSymbol && hasCryptocurrency) {
      // Rename cryptocurrency to crypto_symbol
      const renameQuery = dbType === 'postgres'
        ? 'ALTER TABLE events RENAME COLUMN cryptocurrency TO crypto_symbol'
        : `
          CREATE TABLE events_new AS SELECT id, title, description, category, options, 100 as entry_fee, max_participants, current_participants, prize_pool, total_bets, start_time, end_time, status, correct_answer, event_type_id, created_at, updated_at, cryptocurrency as crypto_symbol, initial_price, final_price, resolution_status, prediction_window, is_daily FROM events;
          DROP TABLE events;
          ALTER TABLE events_new RENAME TO events;
        `;
      
      await pool.query(renameQuery);
      console.log('✅ Renamed cryptocurrency column to crypto_symbol in events table');
      return;
    }
    
    // If both columns exist, we'll keep crypto_symbol and drop cryptocurrency
    if (hasCryptoSymbol && hasCryptocurrency) {
      if (dbType === 'postgres') {
        // Update crypto_symbol with data from cryptocurrency where crypto_symbol is NULL
        await pool.query(
          `UPDATE events
           SET crypto_symbol = cryptocurrency
           WHERE crypto_symbol IS NULL AND cryptocurrency IS NOT NULL`
        );
        
        // Drop the old column
        await pool.query('ALTER TABLE events DROP COLUMN cryptocurrency');
      } else {
        // For SQLite, we need to recreate the table
        await pool.query(`
          CREATE TABLE events_new AS
          SELECT id, title, description, category, options, entry_fee, max_participants, current_participants, prize_pool, total_bets, start_time, end_time, status, correct_answer, event_type_id, created_at, updated_at, COALESCE(crypto_symbol, cryptocurrency) as crypto_symbol, initial_price, final_price, resolution_status, prediction_window, is_daily
          FROM events
        `);
        await pool.query('DROP TABLE events');
        await pool.query('ALTER TABLE events_new RENAME TO events');
      }
      console.log('✅ Migrated data from cryptocurrency to crypto_symbol and removed old column');
      return;
    }
    
    // Check if crypto_symbol exists (no action needed)
    if (hasCryptoSymbol && !hasCryptocurrency) {
      console.log('✅ Events table has correct column: crypto_symbol');
      return;
    }
    
    // Neither column exists - create crypto_symbol column
    const addColumnQuery = dbType === 'postgres'
      ? 'ALTER TABLE events ADD COLUMN IF NOT EXISTS crypto_symbol TEXT DEFAULT \'bitcoin\''
      : 'ALTER TABLE events ADD COLUMN crypto_symbol TEXT DEFAULT \'bitcoin\'';
    
    await pool.query(addColumnQuery);
    console.log('✅ Added crypto_symbol column to events table');
    
  } catch (error) {
    console.error('❌ Error checking events table integrity:', error);
    // Don't throw - this is a best-effort fix, not critical to startup
  }
}

async function runMigrations() {
  const dbType = getDatabaseType();
  try {
    console.log(`🛠️ Running database migrations (${dbType})...`);
    const migrationPath = path.join(__dirname, 'sql', dbType);
    console.log('📁 Migration files directory:', migrationPath);
    
    // Verify migrations directory exists
    if (!(await fs.access(migrationPath).then(() => true).catch(() => false))) {
      throw new Error(`Migrations directory not found: ${migrationPath}`);
    }
    
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
      console.log('Current database version:', currentVersion);
    } catch (e) {
      console.log('No existing schema versions, starting fresh');
    }
    
    // Get all migration files sorted by version
    const migrationFiles = (await fs.readdir(path.join(__dirname, 'sql', dbType)))
        .filter(f => f.startsWith('migrate_v'))
        .sort((a, b) => {
            const aVersions = a.match(/\d+/g).map(Number);
            const bVersions = b.match(/\d+/g).map(Number);
            const aFrom = aVersions[0], aTo = aVersions[1];
            const bFrom = bVersions[0], bTo = bVersions[1];
            // Sort upgrades ascending
            return aTo - bTo;
        });
    
    console.log('📄 Found migration files:', migrationFiles);

    for (const file of migrationFiles) {
        const toVersion = parseInt(file.match(/\d+/g)[1]);
        console.log(`🔍 Processing migration file: ${file} (toVersion: ${toVersion}, currentVersion: ${currentVersion})`);
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
          // For PostgreSQL, we need to handle CREATE INDEX CONCURRENTLY and DO blocks differently
          // as they cannot run inside a transaction block
          // Split SQL but preserve DO blocks with $$ delimiters
          const statements = splitSqlPreservingDoBlocks(migrationSql);
          
          for (const stmt of statements) {
            const trimmedStmt = stmt.trim();
            if (!trimmedStmt) continue;
            
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
            } else if (/^DO\s*\$\$/i.test(trimmedStmt)) {
              // Handle DO blocks with $$ delimiters
              console.log(`Executing DO block outside transaction: ${trimmedStmt.substring(0, 100)}...`);
              try {
                await pool.query(trimmedStmt);
                console.log(`✅ DO block executed successfully`);
              } catch (error) {
                throw error;
              }
            } else {
              // For all other statements, execute with transaction safety
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

// Helper function to split SQL while preserving DO blocks with $$ delimiters
function splitSqlPreservingDoBlocks(sql) {
  const statements = [];
  let currentStatement = '';
  let inDoBlock = false;
  
  // Split by lines to process each line
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // Check for DO block start
    if (/^\s*DO\s*\$\$/.test(line)) {
      inDoBlock = true;
      currentStatement = line + '\n';
      continue;
    }
    
    // If we're in a DO block, check for the end
    if (inDoBlock) {
      currentStatement += line + '\n';
      // Check for end of DO block (END followed by $$)
      if (/\s*END\s*\$\$/.test(line) || /\s*END\s*\$\$;/.test(line)) {
        inDoBlock = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
      continue;
    }
    
    // Regular statement processing
    currentStatement += line + '\n';
    
    // Check if line ends with semicolon (end of statement)
    if (line.trim().endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(stmt => stmt.trim());
}

// --- Event Creation Functions ---
async function createEvent(initialPrice) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  const entryFee = 100;
  console.log('Creating event with entry fee:', entryFee, 'and initial price:', initialPrice);

  // Generate formatted title with closing price question and creation price
  const eventDate = new Date().toISOString().split('T')[0];
  const title = `Which will be the closing price of Bitcoin at the end of the day? (Creation price: $${initialPrice.toFixed(2)})`;
  
  // Create price range options
  const priceRanges = coingecko.calculatePriceRanges(initialPrice);
  const options = [
    { id: 'range_0_3_up', label: '0-3% up', value: '0-3% up' },
    { id: 'range_3_5_up', label: '3-5% up', value: '3-5% up' },
    { id: 'range_5_up', label: '5%+ up', value: '5%+ up' },
    { id: 'range_0_3_down', label: '0-3% down', value: '0-3% down' },
    { id: 'range_3_5_down', label: '3-5% down', value: '3-5% down' },
    { id: 'range_5_down', label: '5%+ down', value: '5%+ down' }
  ];
  
  // Look up event type 'prediction'
  const typeQuery = await pool.query(`SELECT id FROM event_types WHERE name = 'prediction'`);
  if (typeQuery.rows.length === 0) {
    throw new Error("Event type 'prediction' not found");
  }
  const eventTypeId = typeQuery.rows[0].id;

  await pool.query(
    `INSERT INTO events (title, crypto_symbol, initial_price, start_time, end_time, location, event_type_id, status, resolution_status, entry_fee, options)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'pending', $8, $9)`,
    [title, process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', initialPrice, startTime, endTime, 'Global', eventTypeId, entryFee, JSON.stringify(options)]
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
        
        // Determine outcome based on price range
        const correctAnswer = coingecko.determinePriceRange(event.initial_price, finalPrice);
        
        // Update event with correct answer
        await pool.query(
          `UPDATE events
           SET correct_answer = $1
           WHERE id = $2`,
          [correctAnswer, event.id]
        );
        
        // Calculate total pot from all participants
        const { rows: [potData] } = await pool.query(
          `SELECT SUM(amount) as total_pot FROM participants WHERE event_id = $1`,
          [event.id]
        );
        
        const totalPot = potData.total_pot || 0;
        
        if (totalPot > 0) {
          // Get all winners with their bet amounts
          const { rows: winners } = await pool.query(
            `SELECT user_id, amount FROM participants WHERE event_id = $1 AND prediction = $2`,
            [event.id, correctAnswer]
          );
          
          if (winners.length > 0) {
            // Calculate total amount bet by winners
            const totalWinnerAmount = winners.reduce((sum, winner) => sum + winner.amount, 0);
            
            // Award proportional share of pot to each winner
            for (const winner of winners) {
              const winnerShare = Math.floor((winner.amount / totalWinnerAmount) * totalPot);
              await pool.query(
                `UPDATE users SET points = points + $1 WHERE id = $2`,
                [winnerShare, winner.user_id]
              );
            }
            
            console.log(`Distributed ${totalPot} points to ${winners.length} winners for event ${event.id}`);
          } else {
            console.log(`No winners for event ${event.id}, pot not distributed`);
          }
        } else {
          console.log(`Event ${event.id} has no pot to distribute`);
        }
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
            return res.status(401).json({ error: 'Token is invalid or expired' });
        }
        console.log('Token verified successfully for user:', user.userId);
        console.log('Full token payload:', user);
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
          startTime,
          endTime,
          location,
          capacity,
          eventTypeId,
          currentPrice
        });

        try {
          // Create new event with all parameters
          const { rows: [newEvent] } = await pool.query(
            `INSERT INTO events (
                title, description, options, entry_fee, start_time, end_time,
                location, max_participants, current_participants, prize_pool,
                status, event_type_id, crypto_symbol, initial_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 'active', $9, $10, $11)
            RETURNING *`,
            [
                title, description, JSON.stringify(options), entry_fee,
                startTime, endTime, location || 'Global', capacity || 100, eventTypeId,
                process.env.DEFAULT_CRYPTO_SYMBOL || 'btc', currentPrice
            ]
          );
          console.debug('Event creation successful', newEvent);
          res.status(201).json(newEvent);
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify event is active
    const event = await client.query(
      'SELECT status, end_time FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    
    if (event.rows[0].status !== 'active' || new Date(event.rows[0].end_time) < new Date()) {
      throw new Error('EVENT_CLOSED');
    }

    // Check existing participation
    const existing = await client.query(
      'SELECT 1 FROM participants WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('DUPLICATE_ENTRY');
    }

    // Validate and deduct entry fee
    const balanceCheck = await client.query(
      'SELECT points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (balanceCheck.rows[0].points < entryFee) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    await client.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [entryFee, userId]
    );

    // Record participation
    await client.query(
      'INSERT INTO participants (event_id, user_id, prediction, amount) VALUES ($1, $2, $3, $4)',
      [eventId, userId, prediction, entryFee]
    );

    await client.query('COMMIT');
    res.json({ success: true, newBalance: balanceCheck.rows[0].points - entryFee });
  } catch (error) {
    await client.query('ROLLBACK');
    handleParticipationError(error, res);
  } finally {
    client.release();
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
    
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Get tournament details
        const tournament = await client.query(
            'SELECT entry_fee FROM events WHERE id = $1',
            [tournamentId]
        );
        if (tournament.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const entryFee = tournament.rows[0].entry_fee;

        // Check user balance
        const user = await client.query(
            'SELECT points FROM users WHERE id = $1',
            [userId]
        );
        if (user.rows[0].points < entryFee) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Deduct entry fee
        await client.query(
            'UPDATE users SET points = points - $1 WHERE id = $2',
            [entryFee, userId]
        );

        // Add participant
        await client.query(
            'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)',
            [tournamentId, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Joined tournament successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Tournament join error:', error);
        res.status(500).json({ error: 'Failed to join tournament' });
    } finally {
        client?.release();
    }
});

app.post('/api/tournaments/:id/entries', authenticateToken, async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.userId;
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'Invalid entries format' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Verify tournament exists
        const tournament = await client.query(
            'SELECT entry_fee FROM tournaments WHERE id = $1',
            [tournamentId]
        );
        if (tournament.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const entryFee = tournament.rows[0].entry_fee;

        // Check user balance for total entries
        const totalCost = entryFee * entries.length;
        const user = await client.query(
            'SELECT points FROM users WHERE id = $1',
            [userId]
        );
        if (user.rows[0].points < totalCost) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Deduct points
        await client.query(
            'UPDATE users SET points = points - $1 WHERE id = $2',
            [totalCost, userId]
        );

        // Create entries
        for (const entry of entries) {
            await client.query(
                'INSERT INTO tournament_entries (tournament_id, user_id, entry_fee) VALUES ($1, $2, $3)',
                [tournamentId, userId, entryFee]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, entries_created: entries.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Tournament entry error:', error);
        res.status(500).json({ error: 'Failed to create tournament entries' });
    } finally {
        client?.release();
    }
});

app.get('/api/events/:id/pot', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT SUM(entry_fee) AS total_pot FROM tournament_entries WHERE tournament_id = $1',
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
        const eventQuery = await pool.query(
            'SELECT entry_fee, end_time, status FROM events WHERE id = $1',
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
    
    // Validate prediction - updated to use price range options
    const validPredictions = [
        '0-3% up', '3-5% up', '5%+ up',
        '0-3% down', '3-5% down', '5%+ down'
    ];
    
    if (!validPredictions.includes(prediction)) {
        console.log('DEBUG: Invalid prediction value', { prediction });
        return res.status(400).json({ error: 'Invalid prediction value' });
    }
  
    // Get event details including pot system configuration
    const eventQuery = await pool.query(
        'SELECT pot_enabled, min_bet, max_bet, status, end_time FROM events WHERE id = $1',
        [eventId]
    );
    
    if (eventQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventQuery.rows[0];
    
    // Check if event is still active
    const now = new Date();
    const endTime = new Date(event.end_time);
    if (now >= endTime || event.status !== 'active') {
        return res.status(400).json({ error: 'Event is no longer active' });
    }
  
    // Validate bet amount against event constraints
    if (selectedEntryFee < event.min_bet || selectedEntryFee > event.max_bet) {
        return res.status(400).json({
            error: `Bet amount must be between ${event.min_bet} and ${event.max_bet} points`
        });
    }

    let client;
    try {
        console.log('DEBUG: Attempting to acquire database client');
        client = await pool.connect();
        console.log('DEBUG: Database client acquired successfully');
    } catch (error) {
        console.error('Failed to acquire database client:', error);
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    try {
        console.log('DEBUG: Starting transaction');
        await client.query('BEGIN');
        console.log('DEBUG: Transaction started');

        // Check event exists
        console.log('DEBUG: Checking if event exists', { eventId });
        const eventQuery = await client.query('SELECT * FROM events WHERE id = $1', [eventId]);
        if (eventQuery.rows.length === 0) {
            console.log('DEBUG: Event not found', { eventId });
            await client.query('ROLLBACK');
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
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Event has ended' });
        }
        
        // Check user has sufficient points
        console.log('DEBUG: Checking user points', { userId });
        const userQuery = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
        if (userQuery.rows.length === 0) {
            console.log('DEBUG: User not found', { userId });
            await client.query('ROLLBACK');
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
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient points' });
        }

        // Check if user has already bet on this event
        console.log('DEBUG: Checking if user already bet on this event', { eventId, userId });
        const existingBet = await client.query(
            'SELECT * FROM participants WHERE event_id = $1 AND user_id = $2',
            [eventId, userId]
        );
        if (existingBet.rows.length > 0) {
            console.log('DEBUG: User already placed a bet on this event', { eventId, userId });
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You have already placed a bet on this event' });
        }

        // Insert bet into participants table
        console.log('DEBUG: Inserting bet into participants table', { eventId, userId, prediction, amount: selectedEntryFee });
        
        // First, check if the amount column exists in the participants table
        try {
            if (dbType === 'postgres') {
                const columnCheck = await client.query(
                    `SELECT column_name
                     FROM information_schema.columns
                     WHERE table_name = 'participants' AND column_name = 'amount'`
                );
                
                if (columnCheck.rows.length === 0) {
                    console.error('ERROR: amount column does not exist in participants table');
                    await client.query('ROLLBACK');
                    return res.status(500).json({ error: 'Database schema error: amount column missing' });
                }
            } else {
                // For SQLite
                const columnCheck = await client.query(
                    `PRAGMA table_info(participants)`
                );
                
                const hasAmountColumn = columnCheck.rows.some(row => row.name === 'amount');
                if (!hasAmountColumn) {
                    console.error('ERROR: amount column does not exist in participants table');
                    await client.query('ROLLBACK');
                    return res.status(500).json({ error: 'Database schema error: amount column missing' });
                }
            }
        } catch (schemaError) {
            console.error('ERROR: Failed to check participants table schema', schemaError);
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Database schema check failed' });
        }
        
        const { rows: [newBet] } = await client.query(
            `INSERT INTO participants (event_id, user_id, prediction, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [eventId, userId, prediction, selectedEntryFee]
        );
        console.log('DEBUG: Bet inserted successfully', { newBet });

        // Deduct the bet amount from the user's points
        console.log('DEBUG: Deducting bet amount from user points', { userId, amount: selectedEntryFee });
        await client.query(
            'UPDATE users SET points = points - $1 WHERE id = $2',
            [selectedEntryFee, userId]
        );
        console.log('DEBUG: Entry fee deducted successfully');
        
        // Remove prize_pool update as it's now calculated from participants table
        console.log('DEBUG: Updating event total_bets', { eventId });
        await client.query(
            `UPDATE events
             SET total_bets = total_bets + 1
             WHERE id = $1`,
            [eventId]
        );
        console.log('DEBUG: Event total_bets updated successfully');
        
        // Update current_participants count
        console.log('DEBUG: Updating event current_participants count', { eventId });
        await client.query(
            `UPDATE events
             SET current_participants = (
               SELECT COUNT(*) FROM participants WHERE event_id = $1
             )
             WHERE id = $1`,
            [eventId]
        );
        console.log('DEBUG: Event current_participants count updated successfully');
        
        await client.query('COMMIT');
        console.log('DEBUG: Transaction committed successfully', { newBet });
        res.status(201).json(newBet);
    } catch (error) {
        console.log('DEBUG: Error in bet placement, attempting rollback', { error });
        if (client) {
            try {
                await client.query('ROLLBACK');
                console.log('DEBUG: Transaction rolled back successfully');
            } catch (rollbackError) {
                console.error('Failed to rollback transaction:', rollbackError);
            }
        }
        console.error('❌ Bet placement error:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (client) {
            console.log('DEBUG: Releasing database client');
            client.release();
        }
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
    
    const queryText = `
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
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id) AS current_participants,
        COALESCE((SELECT SUM(amount) FROM participants WHERE event_id = e.id), 0) AS prize_pool,
        et.name as event_type
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.status = 'active' OR e.resolution_status = 'pending'`;
    
    sqlLogger.debug({query: queryText}, "Executing active events query");
    console.log('DEBUG: Executing query:', queryText);
    
    const { rows } = await pool.query(queryText);
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

// GET event details
app.get('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that id is a number
    if (isNaN(id) || !Number.isInteger(parseFloat(id))) {
      return res.status(400).json({ error: 'Invalid event ID format' });
    }
    
    const eventId = parseInt(id);
    
    // Get event data with participant counts and prize pool
    const { rows } = await pool.query(
      `SELECT
        e.*,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id) AS current_participants,
        COALESCE((SELECT SUM(amount) FROM participants WHERE event_id = e.id), 0) AS prize_pool,
        (SELECT prediction FROM participants WHERE event_id = e.id AND user_id = $1) AS user_prediction
      FROM events e
      WHERE e.id = $2`,
      [req.userId, eventId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Add current price from CoinGecko if event is active
    const event = rows[0];
    if (event.status === 'active' || event.resolution_status === 'pending') {
      try {
        event.current_price = await coingecko.getCurrentPrice(event.crypto_symbol || 'bitcoin');
        
        // Add price range information for active events
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
    
    // Check if user has already claimed points today
    // Query only last_claimed column as ensureUsersTableIntegrity ensures this is the correct column
    const { rows: claimCheck } = await pool.query(
      `SELECT id, points, last_claimed, last_login_date FROM users WHERE id = $1`,
      [req.userId]
    );

    // Log for debugging
    console.log('User claim check result:', claimCheck);
    
    // Check if the query returned any results
    if (!claimCheck) {
      console.error('Database query returned undefined for user:', req.userId);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (claimCheck.length === 0) {
      console.log('User not found in database for claim request');
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
    try {
      if (lastClaimed) {
        const lastClaimedDate = new Date(lastClaimed);
        
        // Check if the date is valid
        if (isNaN(lastClaimedDate.getTime())) {
          console.log('Invalid last claimed date, treating as no previous claim');
        } else {
          const timeDifference = now - lastClaimedDate;
          const hoursSinceLastClaim = timeDifference / (1000 * 60 * 60);
          const minutesSinceLastClaim = timeDifference / (1000 * 60);
          const secondsSinceLastClaim = timeDifference / 1000;
          
          console.log('Time calculation details:', {
            now: now.toISOString(),
            lastClaimed: lastClaimedDate.toISOString(),
            timeDifference: timeDifference,
            hoursSinceLastClaim: hoursSinceLastClaim,
            minutesSinceLastClaim: minutesSinceLastClaim,
            secondsSinceLastClaim: secondsSinceLastClaim,
            lastClaimedType: typeof lastClaimed,
            lastClaimedValue: lastClaimed,
            lastClaimedDateIsValid: !isNaN(lastClaimedDate.getTime()),
            nowIsValid: !isNaN(now.getTime())
          });
          
          if (hoursSinceLastClaim < 24) {
            console.log('User attempted to claim points within 24 hours');
            return res.status(400).json({
              error: 'You can only claim free points once every 24 hours',
              hoursRemaining: Math.ceil(24 - hoursSinceLastClaim),
              lastClaimed: lastClaimed,
              currentTime: now
            });
          }
        }
      }
    } catch (dateError) {
      console.error('Error processing last claimed date:', dateError);
      // Continue with the claim process if there's an error with the date
    }

    // Log before updating user points
    console.log('Awarding 250 points to user:', req.userId);
    
    // Additional validation to ensure we're not hitting the 24-hour limit incorrectly
    console.log('Final validation before awarding points:', {
      userId: req.userId,
      lastClaimed: lastClaimed,
      now: now.toISOString(),
      hoursSinceLastClaim: lastClaimed ? (now - new Date(lastClaimed)) / (1000 * 60 * 60) : null
    });
    
    try {
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
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error in PostgreSQL transaction:', error);
          throw error;
        } finally {
          client.release();
        }
      } else {
        // For SQLite, use direct query (our SQLite mock handles the transaction internally)
        const pointsToAward = 250;
        const { rows: [updatedUser] } = await pool.query(
          `UPDATE users
           SET points = points + $1, last_claimed = datetime('now'), last_login_date = datetime('now')
           WHERE id = $2
           RETURNING id, username, points`,
          [pointsToAward, req.userId]
        );
        
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
      }
    } catch (dbError) {
      console.error('Database error when updating user points:', dbError);
      return res.status(500).json({ error: 'Failed to update user points in database' });
    }
  } catch (error) {
    console.error('Error claiming free points:', error);
    res.status(500).json({ error: 'Failed to claim points' });
  }
});

// GET user profile endpoint
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, points FROM users WHERE id = $1',
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
    
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.initial_price,
         e.final_price,
         e.resolution_status,
         e.start_time,
         e.end_time,
         e.correct_answer,
         p.prediction,
         CASE
           WHEN e.resolution_status = 'resolved' THEN
             CASE
               WHEN p.prediction = e.correct_answer THEN 'win'
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
      console.log('Initial event creation triggered with price:', price);
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
    console.log('Daily event creation triggered with price:', currentPrice);
    await createEvent(currentPrice);
    console.log("Created new Bitcoin event with initial price: $" + currentPrice);
  } catch (error) {
    console.error('Error creating daily event:', error);
  }
}

// Schedule cron jobs
cron.schedule('0 0 * * *', createDailyEvent);
cron.schedule('0 0 * * *', resolvePendingEvents); // This means "at minute 0 of every hour"


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
    console.log("Database connection successful");
    
    // Try to start the server on the specified port or an alternative port
    const server = await startServerOnAvailablePort();
    
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

process.on('SIGINT', () => {
    console.log("\nShutting down server...");
    pool.end(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
    });
});