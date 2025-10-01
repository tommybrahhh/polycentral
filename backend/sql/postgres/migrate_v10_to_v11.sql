-- Migration v10 to v11: Add missing total_bets column to events table
-- This migration ensures the events table has the total_bets column

DO $$
BEGIN
    -- Check if total_bets column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'total_bets'
    ) THEN
        -- Add the missing total_bets column
        ALTER TABLE events ADD COLUMN total_bets INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;