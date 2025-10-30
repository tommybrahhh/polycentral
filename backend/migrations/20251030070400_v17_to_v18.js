/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v17 to v18: Add email change verification system

      -- Create table for email change verification tokens
      CREATE TABLE email_change_verifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          new_email TEXT NOT NULL,
          verification_token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used BOOLEAN DEFAULT FALSE
      );

      -- Create index for faster token lookups
      CREATE INDEX idx_email_change_tokens_token ON email_change_verifications(verification_token);
      CREATE INDEX idx_email_change_tokens_user ON email_change_verifications(user_id);
      CREATE INDEX idx_email_change_tokens_expires ON email_change_verifications(expires_at);

      -- Add email verification status to users table
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Migration v17 to v18: Add email change verification system (SQLite)

      -- Create table for email change verification tokens
      CREATE TABLE IF NOT EXISTS email_change_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          new_email TEXT NOT NULL,
          verification_token TEXT NOT NULL UNIQUE,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          used BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create index for faster token lookups
      CREATE INDEX IF NOT EXISTS idx_email_change_tokens_token ON email_change_verifications(verification_token);
      CREATE INDEX IF NOT EXISTS idx_email_change_tokens_user ON email_change_verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_change_tokens_expires ON email_change_verifications(expires_at);

      -- Add email verification status to users table
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
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
      DROP TABLE IF EXISTS email_change_verifications;
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      DROP TABLE IF EXISTS email_change_verifications;
      -- SQLite does not support dropping columns directly without recreating the table.
      -- Manual intervention may be required for rollback of email_verified.
      console.log('SQLite: Dropping columns is not directly supported via ALTER TABLE. Manual intervention for email_verified may be required.');
    `);
  }
};