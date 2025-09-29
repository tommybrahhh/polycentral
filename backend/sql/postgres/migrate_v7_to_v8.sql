-- Migration v7 to v8: Rename points_paid to amount
-- Only rename if points_paid column exists and amount column doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'points_paid'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'amount'
    ) THEN
        ALTER TABLE participants RENAME COLUMN points_paid TO amount;
    END IF;
END $$;