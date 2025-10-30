
// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'sqlite3', // Default to sqlite3 for development
    connection: process.env.DATABASE_URL || {
      filename: './database.sqlite' // Default sqlite file
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  },

  production: {
    client: 'pg', // PostgreSQL for production
    connection: process.env.DATABASE_URL, // Use DATABASE_URL env var for production
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};
