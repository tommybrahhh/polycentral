-- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TEXT;

-- For SQLite, we'll rely on the application's ensureParticipantsTableIntegrity function
-- to handle column renaming, as SQLite migrations are more complex for column operations