const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Trust Railway proxy
app.set('trust proxy', 1);

// Enhanced CORS configuration
console.log('🔧 Environment Variables:');
console.log('CORS_ORIGINS:', process.env.CORS_ORIGINS);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Configure CORS with environment variables and debug logging
const allowedOrigins = process.env.CORS_ORIGINS?.split(',')?.map(o => o.trim()) || [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://polyc-seven.vercel.app'
];
console.log('🔧 Allowed CORS Origins:', allowedOrigins);

// Configure CORS middleware

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      console.log(`✅ Allowing request from: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ Blocking request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-HTTP-Method-Override'
  ],
  credentials: true,
  optionsSuccessStatus: 204
};

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} ${req.method} ${req.path} from ${req.headers.origin}`);
  next();
});

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Database integrity checks
function getDatabaseType() {
  return process.env.DATABASE_URL?.includes('postgres') ? 'postgres' : 'sqlite';
}

async function ensurePlatformFeesTableIntegrity() {
  const dbType = getDatabaseType();
  if (dbType !== 'sqlite') return; // Only needed for SQLite
  
  try {
    console.log('🔧 Checking platform_fees table integrity...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='platform_fees'
    `);
    
    if (tableExists.rows.length === 0) {
      // Create platform_fees table
      await pool.query(`
        CREATE TABLE platform_fees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          fee_amount INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created platform_fees table');
    }
    
    // Check if indexes exist
    const indexExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='index' AND name='idx_platform_fees_event'
    `);
    
    if (indexExists.rows.length === 0) {
      await pool.query(`
        CREATE INDEX idx_platform_fees_event ON platform_fees(event_id)
      `);
      console.log('✅ Created index on platform_fees.event_id');
    }
    
    console.log('✅ Platform fees table integrity check completed');
  } catch (error) {
    console.error('❌ Error checking platform fees table integrity:', error);
  }
}

// Ensure audit_logs table has the correct structure
async function ensureAuditLogsTableIntegrity() {
  const dbType = getDatabaseType();
  if (dbType !== 'sqlite') return; // Only needed for SQLite
  
  try {
    console.log('🔧 Checking audit_logs table integrity...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'
    `);
    
    if (tableExists.rows.length === 0) {
      // Create audit_logs table
      await pool.query(`
        CREATE TABLE audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created audit_logs table');
    }
    
    // Check if indexes exist
    const indexExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='index' AND name='idx_audit_logs_event'
    `);
    
    if (indexExists.rows.length === 0) {
      await pool.query(`
        CREATE INDEX idx_audit_logs_event ON audit_logs(event_id)
      `);
      console.log('✅ Created index on audit_logs.event_id');
    }
    
    console.log('✅ Audit logs table integrity check completed');
  } catch (error) {
    console.error('❌ Error checking audit logs table integrity:', error);
  }
}

// Ensure event_outcomes table has the correct structure
async function ensureEventOutcomesTableIntegrity() {
  const dbType = getDatabaseType();
  if (dbType !== 'sqlite') return; // Only needed for SQLite
  
  try {
    console.log('🔧 Checking event_outcomes table integrity...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='event_outcomes'
    `);
    
    if (tableExists.rows.length === 0) {
      // Create event_outcomes table
      await pool.query(`
        CREATE TABLE event_outcomes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
          points_awarded INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created event_outcomes table');
    }
    
    // Check if indexes exist
    const indexExists = await pool.query(`
      SELECT name FROM sqlite_master WHERE type='index' AND name='idx_event_outcomes_participant'
    `);
    
    if (indexExists.rows.length === 0) {
      await pool.query(`
        CREATE INDEX idx_event_outcomes_participant ON event_outcomes(participant_id)
      `);
      console.log('✅ Created index on event_outcomes.participant_id');
    }
    
    console.log('✅ Event outcomes table integrity check completed');
  } catch (error) {
    console.error('❌ Error checking event outcomes table integrity:', error);
  }
}