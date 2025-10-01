-- Migration v8 to v9: Fix last_claimed column naming
-- This migration ensures the last_claimed column is properly set up
-- and data from last_claim_date is migrated if needed

-- First, check if last_claimed column exists and last_claim_date exists
-- If both exist, we need to migrate data from last_claim_date to last_claimed
-- and then drop last_claim_date
-- If only last_claimed exists, we're good
-- If only last_claim_date exists, we need to rename it to last_claimed

-- Using DO block to handle conditional logic
DO $$
BEGIN
    -- Check if last_claim_date exists and last_claimed doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_claim_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_claimed'
    ) THEN
        -- Rename last_claim_date to last_claimed
        ALTER TABLE users RENAME COLUMN last_claim_date TO last_claimed;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_claim_date'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_claimed'
    ) THEN
        -- Both columns exist, migrate data from last_claim_date to last_claimed
        -- Update last_claimed with data from last_claim_date where last_claimed is NULL
        UPDATE users 
        SET last_claimed = last_claim_date 
        WHERE last_claimed IS NULL AND last_claim_date IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE users DROP COLUMN last_claim_date;
    END IF;
END $$;