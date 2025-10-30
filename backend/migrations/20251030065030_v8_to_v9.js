/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add entry fee check constraint for tournaments
      ALTER TABLE tournaments
      ADD CONSTRAINT entry_fee_check
      CHECK (
          entry_fee >= 100
          AND entry_fee % 25 = 0
      );
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we recreate the table
      PRAGMA foreign_keys=off;

      BEGIN TRANSACTION;

      -- Create new table with constraint
      CREATE TABLE tournaments_new (
          -- Existing columns remain the same
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          options TEXT,
          entry_fee INTEGER NOT NULL CHECK (entry_fee >= 100 AND entry_fee % 25 = 0),
          -- ... other columns ...
          
          -- Maintain existing constraints
          CHECK (status IN ('active', 'completed', 'canceled'))
      );

      -- Copy data from old table
      INSERT INTO tournaments_new SELECT * FROM tournaments;

      -- Drop old table and rename new one
      DROP TABLE tournaments;
      ALTER TABLE tournaments_new RENAME TO tournaments;

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
      ALTER TABLE tournaments
      DROP CONSTRAINT IF EXISTS entry_fee_check;
    `);
  } else if (client === 'sqlite3') {
    // SQLite doesn't support dropping constraints directly.
    // Reverting this would involve recreating the table without the constraint.
    // For simplicity, we'll log a message.
    console.log('SQLite: Dropping CHECK constraint for entry_fee is not directly supported via ALTER TABLE. Manual intervention or table recreation may be required.');
  }
};