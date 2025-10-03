DO $$
BEGIN
    RAISE NOTICE 'Starting migration v10→v11 - Checking prerequisites';
    PERFORM assert_schema_version(10);
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'participants'
    ) THEN
        RAISE NOTICE 'Participants table does not exist, creating it';
        CREATE TABLE participants (
            event_id INTEGER REFERENCES events(id),
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (event_id, user_id)
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'prediction'
    ) THEN
        RAISE NOTICE 'Adding prediction column';
        ALTER TABLE participants
        ADD COLUMN prediction VARCHAR(10);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants' AND column_name = 'settled'
    ) THEN
        RAISE NOTICE 'Adding settled column';
        ALTER TABLE participants
        ADD COLUMN settled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- Idempotent index creation
CREATE INDEX IF NOT EXISTS idx_participants_unsettled ON participants (event_id)
WHERE settled = FALSE;

-- Update schema version
-- Safe schema version update with transaction
BEGIN;
LOCK TABLE __schema_versions IN EXCLUSIVE MODE;
INSERT INTO __schema_versions (version) VALUES (11)
ON CONFLICT (version) DO NOTHING;
COMMIT;

-- Rollback safeguard
COMMENT ON TABLE participants IS 'Contains event participation records v2';
CREATE OR REPLACE FUNCTION assert_schema_version(expected_version INT) RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'Checking schema version matches expected %', expected_version;
    IF NOT EXISTS (
        SELECT 1 FROM __schema_versions WHERE version = expected_version
    ) THEN
        RAISE EXCEPTION 'Schema version mismatch. Expected %, found %',
            expected_version, (SELECT MAX(version) FROM __schema_versions);
    END IF;
END;
$$ LANGUAGE plpgsql;