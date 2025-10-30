/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Migration v7 to v8: Add entry fee validation constraints
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'events_entry_fee_check'
          ) THEN
              ALTER TABLE events
              ADD CONSTRAINT events_entry_fee_check
              CHECK (entry_fee >= 100 AND entry_fee % 25 = 0);
          END IF;
      END $$;
    `);
  } else if (client === 'sqlite3') {
    // For SQLite, adding CHECK constraints via ALTER TABLE is limited.
    // It's generally recommended to recreate the table for complex constraint changes.
    // For this specific case, we'll rely on application-level validation
    // or assume the constraint is handled during table creation in initial_schema_setup.
    console.log('SQLite: Skipping direct addition of CHECK constraint for entry_fee. Application-level validation or table recreation is recommended.');
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
      DROP CONSTRAINT IF EXISTS events_entry_fee_check;
    `);
  } else if (client === 'sqlite3') {
    console.log('SQLite: Dropping CHECK constraint for entry_fee is not directly supported via ALTER TABLE. Manual intervention or table recreation may be required.');
  }
};