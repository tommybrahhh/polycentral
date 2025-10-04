-- Migration v10 to v11: Add prediction and settled columns to participants
-- Check current version
DO $$
DECLARE
    current_version INTEGER;
BEGIN
    SELECT MAX(version) INTO current_version FROM schema_versions;
    IF current_version != 10 THEN
        RAISE EXCEPTION 'Schema version mismatch. Expected 10, found %', current_version;
    END IF;
END $$;

-- Create participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS participants (
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

-- Add prediction column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'prediction'
    ) THEN
        ALTER TABLE participants ADD COLUMN prediction VARCHAR(10);
    END IF;
END $$;

-- Add settled column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'settled'
    ) THEN
        ALTER TABLE participants ADD COLUMN settled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Idempotent index creation
CREATE INDEX IF NOT EXISTS idx_participants_unsettled ON participants (event_id)
WHERE settled = FALSE;

-- Update schema version
INSERT INTO __schema_versions (version) VALUES (11);

-- Rollback safeguard
COMMENT ON TABLE participants IS 'Contains event participation records v2';