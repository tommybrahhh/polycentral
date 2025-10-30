/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v16 to v17: Add points_history table for tracking point transactions

      -- This script creates the table to log all points transactions.
      CREATE TABLE points_history (
          id SERIAL PRIMARY KEY,

          -- Foreign key to your existing 'users' table.
          -- Assuming the primary key of 'users' is 'id'.
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

          -- The amount points changed by. Can be positive or negative.
          change_amount INTEGER NOT NULL,

          -- The user's new total balance after this transaction.
          new_balance INTEGER NOT NULL,

          -- A code for the reason of the transaction.
          reason VARCHAR(50) NOT NULL, -- e.g., 'event_entry', 'event_win', 'daily_claim'

          -- Foreign key to your existing 'events' table. Nullable.
          event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,

          -- Timestamp for when the transaction occurred.
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- An index to speed up queries for a specific user's history.
      CREATE INDEX idx_points_history_user_id ON points_history(user_id);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v16 to v17: Add points_history table for tracking point transactions (SQLite)

      CREATE TABLE IF NOT EXISTS points_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          change_amount INTEGER NOT NULL,
          new_balance INTEGER NOT NULL,
          reason TEXT NOT NULL,
          event_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
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
      DROP TABLE IF EXISTS points_history;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS points_history;
    `);
  }
};