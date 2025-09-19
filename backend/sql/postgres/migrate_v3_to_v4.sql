-- Add missing columns with proper constraints
ALTER TABLE events
ADD COLUMN IF NOT EXISTS initial_price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_status TEXT NOT NULL DEFAULT 'pending';

-- Backfill existing records where new columns might be null
UPDATE events SET
  initial_price = COALESCE(initial_price, 0),
  resolution_status = COALESCE(resolution_status, 'resolved')
WHERE initial_price IS NULL OR resolution_status IS NULL;