/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Create event_outcomes table
      CREATE TABLE IF NOT EXISTS event_outcomes (
          id SERIAL PRIMARY KEY,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
          points_awarded INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_outcomes_participant ON event_outcomes(participant_id);

      -- Create audit_logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          details JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_id);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v13 to v14: Add platform fee tracking for SQLite
      -- Add platform_fee column to events table
      ALTER TABLE events ADD COLUMN platform_fee INTEGER NOT NULL DEFAULT 0;

      -- Create platform fees tracking table
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
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS event_outcomes;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS platform_fees;
      ALTER TABLE events DROP COLUMN platform_fee;
    `);
  }
};