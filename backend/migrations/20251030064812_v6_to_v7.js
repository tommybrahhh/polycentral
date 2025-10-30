/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      -- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP;

      -- Ensure entry_fee defaults to 100 and update existing events
      ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee INTEGER NOT NULL DEFAULT 100;
      UPDATE events SET entry_fee = 100;
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'participants' AND column_name = 'points_paid'
          ) THEN
              ALTER TABLE participants RENAME COLUMN points_paid TO amount;
          END IF;
      END $$;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TEXT;

      -- Ensure entry_fee defaults to 100 and update existing events
      ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee INTEGER NOT NULL DEFAULT 100;
      UPDATE events SET entry_fee = 100;

      -- For SQLite, we'll rely on the application's ensureParticipantsTableIntegrity function
      -- to handle column renaming, as SQLite migrations are more complex for column operations
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
      ALTER TABLE users
      DROP COLUMN IF EXISTS last_claimed,
      DROP COLUMN IF EXISTS last_login_date;

      ALTER TABLE events
      DROP COLUMN IF EXISTS entry_fee;

      -- Revert points_paid to amount if it was renamed
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'participants' AND column_name = 'amount'
          ) THEN
              ALTER TABLE participants RENAME COLUMN amount TO points_paid;
          END IF;
      END $$;
    `);
  } else if (client === 'sqlite3') {
    // SQLite does not support dropping columns directly without recreating the table.
    // For simplicity, we'll just log a message.
    console.log('SQLite does not support dropping columns directly. Manual intervention may be required for rollback.');
  }
};