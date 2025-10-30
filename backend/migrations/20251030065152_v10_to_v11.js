/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v10 to v11: Add prediction and settled columns to participants
      -- Add prediction column if it doesn't exist
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'participants' AND column_name = 'prediction'
          ) THEN
              ALTER TABLE participants ADD COLUMN prediction VARCHAR(10);
          END IF;
      END $$;

      -- Add settled column if it doesn't exist
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'participants' AND column_name = 'settled'
          ) THEN
              ALTER TABLE participants ADD COLUMN settled BOOLEAN NOT NULL DEFAULT FALSE;
          END IF;
      END $$;

      -- Idempotent index creation
      CREATE INDEX IF NOT EXISTS idx_participants_unsettled ON participants (event_id)
      WHERE settled = FALSE;
    `);
  } else if (client === 'sqlite3') {
    // SQLite: Migration v10 to v11: Add missing total_bets column to events table
    // This migration ensures the events table has the total_bets column

    // SQLite doesn't support DO blocks, so we'll use the application's ensureEventsTableIntegrity function
    // to handle this migration. The function will be called after migrations in the server.js initialization

    // For now, we'll just add a comment to indicate this
    console.log('SQLite: Migration v10 to v11 for total_bets column is handled by application logic or requires manual intervention.');
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
      DROP INDEX IF EXISTS idx_participants_unsettled;
      ALTER TABLE participants
      DROP COLUMN IF EXISTS settled,
      DROP COLUMN IF EXISTS prediction;
    `);
  } else if (client === 'sqlite3') {
    console.log('SQLite: Dropping columns and tables is not directly supported via ALTER TABLE. Manual intervention or table recreation may be required.');
  }
};