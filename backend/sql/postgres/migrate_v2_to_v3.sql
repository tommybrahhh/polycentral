-- Migration v2 to v3: Idempotent column transition
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check for old column
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='events' 
        AND column_name='cryptocurrency'
    ) INTO column_exists;

    IF column_exists THEN
        ALTER TABLE events RENAME COLUMN cryptocurrency TO crypto_symbol;
        
        -- Add new required columns
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS initial_price NUMERIC,
        ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending';
    ELSE
        -- Add new column if not exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='events' 
            AND column_name='crypto_symbol'
        ) THEN
            ALTER TABLE events ADD COLUMN crypto_symbol TEXT DEFAULT 'bitcoin';
            UPDATE events SET crypto_symbol = 'bitcoin' WHERE crypto_symbol IS NULL;
        END IF;
    END IF;
END $$;