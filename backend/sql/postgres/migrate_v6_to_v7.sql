-- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_claimed TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP;

-- Ensure entry_fee defaults to 100 and update existing events
ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee INTEGER NOT NULL DEFAULT 100;
UPDATE events SET entry_fee = 100 WHERE entry_fee IS NULL OR entry_fee = 0;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'points_paid'
    ) THEN
        ALTER TABLE participants RENAME COLUMN points_paid TO amount;
END $$;