/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.raw(`
      -- Add performance indexes
      CREATE INDEX IF NOT EXISTS idx_participants_event_user
      ON participants(event_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_users_wallet
      ON users(wallet_address);
    `);
  } else if (client === 'sqlite3') {
    await knex.raw(`
      -- Add performance indexes
      CREATE INDEX IF NOT EXISTS idx_participants_event_user
      ON participants(event_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_users_wallet
      ON users(wallet_address);
    `);
  }
};

exports.config = { transaction: false };

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.raw(`
      DROP INDEX IF EXISTS idx_participants_event_user;
      DROP INDEX IF EXISTS idx_users_wallet;
    `);
  } else if (client === 'sqlite3') {
    await knex.raw(`
      DROP INDEX IF EXISTS idx_participants_event_user;
      DROP INDEX IF EXISTS idx_users_wallet;
    `);
  }
};