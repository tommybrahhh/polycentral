/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add password reset functionality columns to users table
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

      -- Create indexes for performance optimization
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires);
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support ADD COLUMN IF NOT EXISTS, so we use try-catch
    try {
      await knex.schema.raw(`
        ALTER TABLE users ADD COLUMN password_reset_token TEXT;
      `);
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        throw e;
      }
    }

    try {
      await knex.schema.raw(`
        ALTER TABLE users ADD COLUMN password_reset_expires TEXT;
      `);
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        throw e;
      }
    }

    // Create indexes for SQLite
    await knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires);
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
      -- Drop indexes first
      DROP INDEX IF EXISTS idx_users_password_reset_token;
      DROP INDEX IF EXISTS idx_users_password_reset_expires;

      -- Drop password reset columns
      ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
      ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table
    // For simplicity, we'll just log a message as done in other migrations
    await knex.schema.raw(`
      DROP INDEX IF EXISTS idx_users_password_reset_token;
      DROP INDEX IF EXISTS idx_users_password_reset_expires;
    `);
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback of password reset columns.');
  }
};