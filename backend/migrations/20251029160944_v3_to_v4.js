/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add missing columns with proper constraints
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS initial_price NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending';

      -- Backfill existing records where new columns might be null
      UPDATE events SET
        initial_price = COALESCE(initial_price, 0),
        resolution_status = COALESCE(resolution_status, 'pending')
      WHERE initial_price IS NULL OR resolution_status IS NULL;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support ADD COLUMN IF NOT EXISTS
    // We'll attempt to add columns and catch errors if they already exist
    try {
      await knex.schema.raw(`ALTER TABLE events ADD COLUMN initial_price REAL DEFAULT 0;`);
    } catch (e) {
      console.log('initial_price column already exists or cannot be added in SQLite:', e.message);
    }
    try {
      await knex.schema.raw(`ALTER TABLE events ADD COLUMN resolution_status TEXT DEFAULT 'pending';`);
    } catch (e) {
      console.log('resolution_status column already exists or cannot be added in SQLite:', e.message);
    }

    // Backfill existing records where new columns might be null
    await knex.schema.raw(`
      UPDATE events SET
        initial_price = COALESCE(initial_price, 0),
        resolution_status = COALESCE(resolution_status, 'pending')
      WHERE initial_price IS NULL OR resolution_status IS NULL;
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
      ALTER TABLE events
      DROP COLUMN IF EXISTS resolution_status,
      DROP COLUMN IF EXISTS initial_price;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity, we'll just log a message.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};