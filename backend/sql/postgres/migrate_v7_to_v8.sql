-- Migration v7 to v8: Rename points_paid to amount
-- Only rename if points_paid column exists and amount column doesn't exist
-- Using direct ALTER TABLE with conditional logic to avoid DO block issues

-- We'll use the application's ensureParticipantsTableIntegrity function to handle this
-- The function is called after migrations in the server.js initialization
-- So we can just leave this migration file empty and let the application handle it
-- But for explicitness, we'll add a comment to indicate this
SELECT 'Migration handled by application ensureParticipantsTableIntegrity function' as migration_status;