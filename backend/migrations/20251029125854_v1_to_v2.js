/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      BEGIN;

      -- Add category column to events table if it doesn't exist
      ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;

      -- Add foreign key constraint if it doesn't exist
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'fk_event_id'
          ) THEN
              ALTER TABLE participants
              ADD CONSTRAINT fk_event_id
              FOREIGN KEY (event_id) REFERENCES events(id);
          END IF;
      END $$;

      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- SQLite migration from v1 to v2
      -- Column 'category' is already in the initial schema, so this is not needed.
      SELECT 1;
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
      BEGIN;
      ALTER TABLE participants DROP CONSTRAINT IF EXISTS fk_event_id;
      ALTER TABLE events DROP COLUMN IF EXISTS category;
      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity in this automated migration, we'll just log a message.
    // In a real-world scenario, you might need a more complex rollback strategy for SQLite.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};