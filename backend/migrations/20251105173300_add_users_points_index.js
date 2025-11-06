/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg') {
    await knex.schema.raw(`
      BEGIN;
      
      -- Create index on users.points for leaderboard performance
      CREATE INDEX IF NOT EXISTS idx_users_points ON users (points DESC);
      
      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- SQLite: Create index on users.points for leaderboard performance
      CREATE INDEX IF NOT EXISTS idx_users_points ON users (points DESC);
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
      
      -- Drop the index in PostgreSQL
      DROP INDEX IF EXISTS idx_users_points;
      
      COMMIT;
    `);
  } else if (client === 'sqlite3') {
    await knex.schema.raw(`
      -- SQLite: Drop the index
      DROP INDEX IF EXISTS idx_users_points;
    `);
  }
};