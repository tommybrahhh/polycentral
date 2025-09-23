BEGIN;

-- Add category column to events table if it doesn't exist
-- Using a simpler approach without dollar quoting
CREATE OR REPLACE FUNCTION add_category_column()
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'category'
    ) THEN
        ALTER TABLE events ADD COLUMN category TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_category_column();

-- Remove the function after use
DROP FUNCTION add_category_column();

-- The foreign key addition remains the same
-- Using a simpler approach without dollar quoting
CREATE OR REPLACE FUNCTION add_foreign_key_constraint()
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_event_id'
    ) THEN
        ALTER TABLE participants
        ADD CONSTRAINT fk_event_id
        FOREIGN KEY (event_id) REFERENCES events(id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_foreign_key_constraint();

-- Remove the function after use
DROP FUNCTION add_foreign_key_constraint();

COMMIT;