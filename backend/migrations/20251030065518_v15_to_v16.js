/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration to add is_admin field to users table
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

      -- Add indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);
      CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(is_suspended);
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Columns are already in the initial schema, so this is not needed.
      -- Add indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);
      CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(is_suspended);
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
      DROP INDEX IF EXISTS idx_users_admin;
      DROP INDEX IF EXISTS idx_users_suspended;
      ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
      ALTER TABLE users DROP COLUMN IF EXISTS is_suspended;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity, we'll just log a message.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};