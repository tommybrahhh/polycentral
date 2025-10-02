-- Add missing columns with proper constraints
ALTER TABLE events
ADD COLUMN IF NOT EXISTS initial_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending';

-- Backfill existing records where new columns might be null
UPDATE events SET
  initial_price = COALESCE(initial_price, 0),
  resolution_status = COALESCE(resolution_status, 'pending')
WHERE initial_price IS NULL OR resolution_status IS NULL;