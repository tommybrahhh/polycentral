/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration: Add pot system support to events
      -- This migration removes the fixed entry_fee and enables variable betting

      -- Add pot_enabled column to events table
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS pot_enabled BOOLEAN DEFAULT true;

      -- Add min_bet and max_bet columns for pot system constraints
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS min_bet INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS max_bet INTEGER DEFAULT 1000;

      -- Remove the entry_fee column as it's no longer needed
      -- This will be handled by the application logic for backward compatibility
      -- ALTER TABLE events DROP COLUMN entry_fee;

      -- Create index on pot_enabled for better query performance
      CREATE INDEX IF NOT EXISTS idx_events_pot_enabled ON events(pot_enabled);

      -- Update existing events to enable pot system
      UPDATE events SET pot_enabled = true WHERE pot_enabled IS NULL;

      -- Add constraint to ensure min_bet <= max_bet
      ALTER TABLE events
      DROP CONSTRAINT IF EXISTS chk_min_max_bet;
      ALTER TABLE events 
      ADD CONSTRAINT chk_min_max_bet CHECK (min_bet <= max_bet);

      -- Add constraint to ensure min_bet >= 1
      ALTER TABLE events
      DROP CONSTRAINT IF EXISTS chk_min_bet_positive;
      ALTER TABLE events 
      ADD CONSTRAINT chk_min_bet_positive CHECK (min_bet >= 1);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v12 to v13: Create audit_logs table for SQLite
      CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_id);

      -- Add pot_enabled column to events table
      ALTER TABLE events 
      ADD COLUMN pot_enabled BOOLEAN DEFAULT 1;

      -- Add min_bet and max_bet columns for pot system constraints
      ALTER TABLE events 
      ADD COLUMN min_bet INTEGER DEFAULT 100;

      ALTER TABLE events 
      ADD COLUMN max_bet INTEGER DEFAULT 1000;

      -- Update existing events to enable pot system
      UPDATE events SET pot_enabled = 1 WHERE pot_enabled IS NULL;

      -- Add constraint to ensure min_bet <= max_bet (via triggers or recreate table for full enforcement)
      -- For simplicity here, we rely on application level validation

      -- Add constraint to ensure min_bet >= 1 (rely on app level validation)
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
      ALTER TABLE events
      DROP CONSTRAINT IF EXISTS chk_min_max_bet,
      DROP CONSTRAINT IF EXISTS chk_min_bet_positive;

      DROP INDEX IF EXISTS idx_events_pot_enabled;

      ALTER TABLE events 
      DROP COLUMN IF EXISTS max_bet,
      DROP COLUMN IF EXISTS min_bet,
      DROP COLUMN IF EXISTS pot_enabled;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS audit_logs;
      -- SQLite does not support dropping columns directly without recreating the table.
      -- Manual intervention may be required for rollback of pot_enabled, min_bet, max_bet.
      console.log('SQLite: Dropping columns is not directly supported via ALTER TABLE. Manual intervention for pot_enabled, min_bet, max_bet may be required.');
    `);
  }
};