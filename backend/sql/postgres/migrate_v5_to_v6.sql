-- Add location column to events table if it doesn't exist
-- Using a simpler approach without dollar quoting

-- Check if column exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'location'
    ) THEN
        ALTER TABLE events ADD COLUMN location TEXT DEFAULT 'Global';
    END IF;
END $$;