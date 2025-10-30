/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add platform fee tracking columns
      ALTER TABLE events ADD COLUMN platform_fee INTEGER NOT NULL DEFAULT 0;

      -- Create platform fees tracking table
      CREATE TABLE IF NOT EXISTS platform_fees (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          fee_amount INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_platform_fees_event ON platform_fees(event_id);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v14 to v15: Additional platform fee tracking for SQLite
      -- This migration ensures the platform_fee column exists on the events table
      -- and that the platform_fees table is properly set up

      -- For SQLite, we'll rely on the application's ensureEventsTableIntegrity function
      -- to handle column additions, as SQLite migrations are more complex for column operations

      -- Ensure platform_fees table exists
      CREATE TABLE IF NOT EXISTS platform_fees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          fee_amount INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_platform_fees_event ON platform_fees(event_id);
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
      DROP TABLE IF EXISTS platform_fees;
      ALTER TABLE events DROP COLUMN IF EXISTS platform_fee;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS platform_fees;
      -- SQLite does not support dropping columns directly without recreating the table.
      -- Manual intervention may be required for rollback of platform_fee.
      console.log('SQLite: Dropping columns is not directly supported via ALTER TABLE. Manual intervention for platform_fee may be required.');
    `);
  }
};