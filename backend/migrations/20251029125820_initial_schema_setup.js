/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          wallet_address TEXT UNIQUE,
          points INTEGER DEFAULT 1000,
          total_events INTEGER DEFAULT 0,
          won_events INTEGER DEFAULT 0,
          last_claimed TIMESTAMP,
          last_login_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_admin BOOLEAN DEFAULT FALSE,
          is_suspended BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_users_wallet
      ON users(wallet_address);

      CREATE TABLE IF NOT EXISTS event_types (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
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
          status TEXT DEFAULT 'pending',
          correct_answer TEXT,
          event_type_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          crypto_symbol TEXT DEFAULT 'bitcoin',
          initial_price DECIMAL,
          final_price DECIMAL,
          resolution_status TEXT CHECK (resolution_status IN ('pending', 'resolved')),
          prediction_window TEXT DEFAULT '24 hours',
          is_daily BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS participants (
          id INTEGER REFERENCES events(id),
          user_id INTEGER REFERENCES users(id),
          prediction TEXT NOT NULL,
          amount INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_participants_event_user
      ON participants(event_id, user_id);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          wallet_address TEXT UNIQUE,
          points INTEGER DEFAULT 1000,
          total_events INTEGER DEFAULT 0,
          won_events INTEGER DEFAULT 0,
          last_claimed TEXT,
          last_login_date TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_admin BOOLEAN DEFAULT FALSE,
          is_suspended BOOLEAN DEFAULT FALSE
      );
    `);
    await knex.schema.raw(`
      CREATE TABLE IF NOT EXISTS event_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT
      );
    `);
    await knex.schema.raw(`
      CREATE TABLE IF NOT EXISTS events (
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
          status TEXT DEFAULT 'pending',
          correct_answer TEXT,
          event_type_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          crypto_symbol TEXT DEFAULT 'bitcoin',
          initial_price DECIMAL,
          final_price DECIMAL,
          resolution_status TEXT CHECK (resolution_status IN ('pending', 'resolved')),
          prediction_window TEXT DEFAULT '24 hours',
          is_daily BOOLEAN DEFAULT false
      );
    `);
    await knex.schema.raw(`
      CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER REFERENCES events(id),
          user_id INTEGER REFERENCES users(id),
          prediction TEXT NOT NULL,
          amount INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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
      DROP TABLE IF EXISTS participants;
      DROP TABLE IF EXISTS events;
      DROP TABLE IF EXISTS event_types;
      DROP TABLE IF EXISTS users;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS participants;
      DROP TABLE IF EXISTS events;
      DROP TABLE IF EXISTS event_types;
      DROP TABLE IF EXISTS users;
    `);
  }
};