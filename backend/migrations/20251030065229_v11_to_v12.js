/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- This migration is a no-op for pg because the initial schema already uses the events naming convention.
      SELECT 1;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v11 to v12: Create event_outcomes table for SQLite
      CREATE TABLE IF NOT EXISTS event_outcomes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
          points_awarded INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_outcomes_participant ON event_outcomes(participant_id);
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
      -- This migration is a no-op for pg because the up migration is also a no-op.
      SELECT 1;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS event_outcomes;
    `);
  }
};