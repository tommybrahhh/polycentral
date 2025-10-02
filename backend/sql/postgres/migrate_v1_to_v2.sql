BEGIN;

-- Add category column to events table if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_event_id'
    ) THEN
        ALTER TABLE participants
        ADD CONSTRAINT fk_event_id
        FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END $$;

COMMIT;