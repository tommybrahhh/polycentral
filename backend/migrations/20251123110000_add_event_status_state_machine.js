/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add new status column with state machine values
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS status_new VARCHAR(20) DEFAULT 'OPEN'
      CHECK (status_new IN ('OPEN', 'LOCKED', 'RESOLVED', 'CANCELED'));
      
      -- Update existing records to set proper status based on current state
      UPDATE events 
      SET status_new = CASE 
        WHEN resolution_status = 'resolved' THEN 'RESOLVED'
        WHEN end_time < NOW() AND resolution_status = 'pending' THEN 'LOCKED'
        ELSE 'OPEN'
      END;
      
      -- Drop the old status column
      ALTER TABLE events DROP COLUMN IF EXISTS status;
      
      -- Rename the new column to status
      ALTER TABLE events RENAME COLUMN status_new TO status;
    `);
  } else if (client === 'sqlite3') {
    // SQLite doesn't support multiple ALTER TABLE operations easily
    // We'll need to create a new table and copy data
    await knex.schema.raw(`
      -- Create temporary table with new schema
      CREATE TABLE events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE NOT NULL,
        description TEXT,
        category TEXT,
        options TEXT,
        entry_fee INTEGER NOT NULL DEFAULT 0,
        max_participants INTEGER NOT NULL DEFAULT 100,
        current_participants INTEGER NOT NULL DEFAULT 0,
        prize_pool INTEGER NOT NULL DEFAULT 0,
        total_bets INTEGER NOT NULL DEFAULT 0,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'RESOLVED', 'CANCELED')),
        correct_answer TEXT,
        event_type_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        crypto_symbol TEXT DEFAULT 'bitcoin',
        initial_price DECIMAL,
        final_price DECIMAL,
        resolution_status TEXT CHECK (resolution_status IN ('pending', 'resolved')),
        prediction_window TEXT DEFAULT '24 hours',
        is_daily BOOLEAN DEFAULT false,
        pot_enabled BOOLEAN DEFAULT true,
        min_bet INTEGER DEFAULT 100,
        max_bet INTEGER DEFAULT 1000,
        platform_fee INTEGER NOT NULL DEFAULT 0,
        external_id TEXT
      );

      -- Copy data from old table to new table with status mapping
      INSERT INTO events_new 
      SELECT 
        id, title, description, category, options, entry_fee, max_participants, 
        current_participants, prize_pool, total_bets, start_time, end_time,
        CASE 
          WHEN resolution_status = 'resolved' THEN 'RESOLVED'
          WHEN end_time < datetime('now') AND resolution_status = 'pending' THEN 'LOCKED'
          ELSE 'OPEN'
        END as status,
        correct_answer, event_type_id, created_at, updated_at, crypto_symbol, 
        initial_price, final_price, resolution_status, prediction_window, 
        is_daily, pot_enabled, min_bet, max_bet, platform_fee, external_id
      FROM events;

      -- Drop old table
      DROP TABLE events;

      -- Rename new table
      ALTER TABLE events_new RENAME TO events;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
      CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Revert the changes for PostgreSQL
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS status_old TEXT DEFAULT 'active';
      
      -- Map status back to old values
      UPDATE events 
      SET status_old = CASE 
        WHEN status = 'RESOLVED' THEN 'active'
        WHEN status = 'CANCELED' THEN 'inactive'
        ELSE 'active'
      END;
      
      -- Drop the new status column
      ALTER TABLE events DROP COLUMN IF EXISTS status;
      
      -- Rename the old column back to status
      ALTER TABLE events RENAME COLUMN status_old TO status;
    `);
  } else if (client === 'sqlite3') {
    // SQLite rollback would require similar table recreation
    console.log('SQLite rollback for status migration would require manual intervention');
  }
};