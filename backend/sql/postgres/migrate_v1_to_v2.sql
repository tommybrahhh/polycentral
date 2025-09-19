BEGIN;

-- Add category column to events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'category'
    ) THEN
        ALTER TABLE events ADD COLUMN category TEXT;
    END IF;
END $$;

-- The foreign key addition remains the same
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