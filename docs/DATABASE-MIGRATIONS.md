# Database Migrations

This document explains the database migration system for the Predictions App.

## How Migrations Work

The application uses an automated migration system that:

1. Automatically discovers migration files in the `backend/sql/[dbtype]/` directory
2. Sorts them by version number
3. Applies any migrations that haven't been run yet
4. Records applied migrations in the `schema_versions` table

## Migration Files

Migration files are named using the pattern `migrate_vX_to_vY.sql` where X is the source version and Y is the target version.

### Current Migrations

1. `migrate_v1_to_v2.sql` - Initial migration
2. `migrate_v2_to_v3.sql` - Add event types
3. `migrate_v3_to_v4.sql` - Add cryptocurrency support
4. `migrate_v4_to_v5.sql` - Add prediction windows
5. `migrate_v5_to_v6.sql` - Add daily events flag
6. `migrate_v6_to_v7.sql` - Add user wallet addresses
7. `migrate_v7_to_v8.sql` - Add user statistics
8. `migrate_v8_to_v9.sql` - Add user last login
9. `migrate_v9_to_v10.sql` - Fix column naming and data types
10. `migrate_v10_to_v11.sql` - Add missing total_bets column to events table

## Schema Versions Table

The `schema_versions` table tracks which migrations have been applied:

```sql
CREATE TABLE IF NOT EXISTS schema_versions (
  id SERIAL PRIMARY KEY,
  version INT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Adding New Migrations

To add a new migration:

1. Create a new file in `backend/sql/postgres/` with the naming pattern `migrate_vX_to_vY.sql`
2. Create a corresponding file in `backend/sql/sqlite/` with the same name
3. The application will automatically detect and run the migration on startup

## PostgreSQL Migration Example

```sql
-- Migration v10 to v11: Add missing total_bets column to events table
DO $$
BEGIN
    -- Check if total_bets column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'total_bets'
    ) THEN
        -- Add the missing total_bets column
        ALTER TABLE events ADD COLUMN total_bets INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
```

## SQLite Migration Example

```sql
-- Migration v10 to v11: Add missing total_bets column to events table
-- SQLite doesn't support DO blocks, so we rely on the application's ensureEventsTableIntegrity function
SELECT 'Migration handled by application ensureEventsTableIntegrity function' as migration_status;
```

Note: For SQLite, we rely on the application's `ensureEventsTableIntegrity` function to handle schema changes because SQLite has limited support for ALTER TABLE operations.

## Troubleshooting

If you encounter migration issues:

1. Check the `schema_versions` table to see which migrations have been applied
2. Verify that migration files are correctly named and formatted
3. Check the application logs for specific error messages
4. Ensure both PostgreSQL and SQLite migration files exist for each version