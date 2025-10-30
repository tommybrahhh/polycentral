/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Create tournaments table with entry fee constraints
      CREATE TABLE IF NOT EXISTS tournaments (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL UNIQUE,
          description TEXT,
          entry_fee INTEGER NOT NULL,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
      );

      -- Tournament participants junction table
      CREATE TABLE IF NOT EXISTS tournament_participants (
          tournament_id INTEGER REFERENCES tournaments(id),
          user_id INTEGER REFERENCES users(id),
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tournament_id, user_id)
      );

      -- Tournament entries with points tracking
      CREATE TABLE IF NOT EXISTS tournament_entries (
          id SERIAL PRIMARY KEY,
          tournament_id INTEGER REFERENCES tournaments(id),
          user_id INTEGER REFERENCES users(id),
          entry_fee INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_entry_fee CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
      );

      CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON tournament_entries(tournament_id);
    `);

    // Add version tracking for schema changes (if not already handled by Knex)
    await knex.schema.raw(`
      DROP TABLE IF EXISTS schema_versions;
      CREATE TABLE IF NOT EXISTS schema_versions (
          version INTEGER PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      COMMENT ON TABLE schema_versions IS 'Tracks database schema migration versions';
    `);

    await knex.schema.raw(`
      INSERT INTO schema_versions (version) VALUES (10)
      ON CONFLICT (version) DO NOTHING;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      PRAGMA foreign_keys=off;

      BEGIN TRANSACTION;

      -- Create tournaments table with enhanced constraints
      CREATE TABLE tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL UNIQUE,
          description TEXT,
          entry_fee INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
      );

      -- Tournament participants junction table
      CREATE TABLE tournament_participants (
          tournament_id INTEGER,
          user_id INTEGER,
          joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (tournament_id, user_id),
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Tournament entries with points tracking
      CREATE TABLE tournament_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER,
          user_id INTEGER,
          entry_fee INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          CHECK (entry_fee >= 100 AND entry_fee % 25 = 0),
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_tournament_entries_user ON tournament_entries(user_id);
      CREATE INDEX idx_tournament_entries_tournament ON tournament_entries(tournament_id);

      COMMIT;

      PRAGMA foreign_keys=on;
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
      DROP TABLE IF EXISTS tournament_entries;
      DROP TABLE IF EXISTS tournament_participants;
      DROP TABLE IF EXISTS tournaments;
      DELETE FROM schema_versions WHERE version = 10;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      PRAGMA foreign_keys=off;
      BEGIN TRANSACTION;
      DROP TABLE IF EXISTS tournament_entries;
      DROP TABLE IF EXISTS tournament_participants;
      DROP TABLE IF EXISTS tournaments;
      COMMIT;
      PRAGMA foreign_keys=on;
    `);
  }
};