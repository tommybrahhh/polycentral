/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v2 to v3: Idempotent column transition
      -- Rename cryptocurrency column to crypto_symbol if it exists
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name='events'
              AND column_name='cryptocurrency'
          ) THEN
              ALTER TABLE events RENAME COLUMN cryptocurrency TO crypto_symbol;
          END IF;
      END $$;

      -- Add new required columns
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS crypto_symbol TEXT DEFAULT 'bitcoin',
      ADD COLUMN IF NOT EXISTS initial_price NUMERIC,
      ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending';
    `);
  } else if (client === 'sqlite3') {
        await knex.schema.raw(`
          -- Columns are already in the initial schema, so this is not needed.
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
      ALTER TABLE events
      DROP COLUMN IF EXISTS resolution_status,
      DROP COLUMN IF EXISTS initial_price,
      DROP COLUMN IF EXISTS crypto_symbol;

      -- If cryptocurrency column existed before, rename crypto_symbol back to cryptocurrency
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name='events'
              AND column_name='crypto_symbol'
          ) THEN
              ALTER TABLE events RENAME COLUMN crypto_symbol TO cryptocurrency;
          END IF;
      END $$;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity, we'll just log a message.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};