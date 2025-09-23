-- Add location column to events table if it doesn't exist
-- Using ALTER TABLE ... IF NOT EXISTS (PostgreSQL 9.6+)

-- This is a simpler approach that doesn't require dollar quoting
-- It will only add the column if it doesn't already exist
ALTER TABLE IF EXISTS events ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Global';