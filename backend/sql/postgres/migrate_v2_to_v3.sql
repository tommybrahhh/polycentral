-- Migration v2 to v3: Idempotent column transition
-- Rename cryptocurrency column to crypto_symbol if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='events'
        AND column_name='cryptocurrency'
    ) THEN
        ALTER TABLE events RENAME COLUMN cryptocurrency TO crypto_symbol;
    END IF;
END $$;

-- Add new required columns
ALTER TABLE events
ADD COLUMN IF NOT EXISTS crypto_symbol TEXT DEFAULT 'bitcoin',
ADD COLUMN IF NOT EXISTS initial_price NUMERIC,
ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending';