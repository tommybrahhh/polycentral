-- Migration v9 to v10: Fix events table column naming and data types
-- This migration ensures the events table has the correct column structure
-- and data types for compatibility between PostgreSQL and SQLite

-- Using DO block to handle conditional logic
DO $$
BEGIN
    -- Check if cryptocurrency column exists and crypto_symbol doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'cryptocurrency'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'crypto_symbol'
    ) THEN
        -- Rename cryptocurrency to crypto_symbol
        ALTER TABLE events RENAME COLUMN cryptocurrency TO crypto_symbol;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'cryptocurrency'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'crypto_symbol'
    ) THEN
        -- Both columns exist, migrate data from cryptocurrency to crypto_symbol
        -- Update crypto_symbol with data from cryptocurrency where crypto_symbol is NULL
        UPDATE events 
        SET crypto_symbol = cryptocurrency 
        WHERE crypto_symbol IS NULL AND cryptocurrency IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE events DROP COLUMN cryptocurrency;
    END IF;
    
    -- Check if prediction_window is using INTERVAL type and change to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'prediction_window' AND data_type = 'interval'
    ) THEN
        -- Add new column with TEXT type
        ALTER TABLE events ADD COLUMN prediction_window_new TEXT DEFAULT '24 hours';
        
        -- Copy data from old column to new column
        UPDATE events SET prediction_window_new = prediction_window::TEXT;
        
        -- Drop old column
        ALTER TABLE events DROP COLUMN prediction_window;
        
        -- Rename new column to original name
        ALTER TABLE events RENAME COLUMN prediction_window_new TO prediction_window;
    END IF;
END $$;