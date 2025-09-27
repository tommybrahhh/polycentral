-- Add last_claimed column to users table for tracking free points claims
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TIMESTAMP;