/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add location column to events table if it doesn't exist
      ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Global';
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support ADD COLUMN IF NOT EXISTS
    // We'll attempt to add column and catch errors if it already exists
    try {
      await knex.schema.raw(`ALTER TABLE events ADD COLUMN location TEXT DEFAULT 'Global';`);
    } catch (e) {
      console.log('location column already exists or cannot be added in SQLite:', e.message);
    }
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
      ALTER TABLE events
      DROP COLUMN IF EXISTS location;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity, we'll just log a message.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};