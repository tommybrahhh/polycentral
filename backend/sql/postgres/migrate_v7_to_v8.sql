-- Migration v7 to v8: Add entry fee validation constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'events_entry_fee_check'
    ) THEN
        ALTER TABLE events
        ADD CONSTRAINT events_entry_fee_check 
        CHECK (entry_fee >= 100 AND entry_fee % 25 = 0);
    END IF;
END $$;