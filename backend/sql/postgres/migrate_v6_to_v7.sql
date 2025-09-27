-- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP;

-- Rename points_paid column to amount in participants table for consistency with application code
ALTER TABLE participants RENAME COLUMN points_paid TO amount;