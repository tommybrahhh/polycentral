-- Migration v8 to v9: Fix last_claimed column naming for SQLite
-- This migration ensures the last_claimed column is properly set up
-- and data from last_claim_date is migrated if needed

-- SQLite doesn't support DO blocks, so we'll use the application's ensureUsersTableIntegrity function
-- to handle this migration. The function will be called after migrations in the server.js initialization

-- For now, we'll just add a comment to indicate this
SELECT 'Migration handled by application ensureUsersTableIntegrity function' as migration_status;