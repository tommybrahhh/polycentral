-- Create tournaments table with entry fee constraints
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    entry_fee INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
);

-- Ensure base participants table exists
CREATE TABLE IF NOT EXISTS participants (
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

-- Tournament participants junction table
CREATE TABLE tournament_participants (
    tournament_id INTEGER REFERENCES tournaments(id),
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, user_id)
);

-- Tournament entries with points tracking
CREATE TABLE tournament_entries (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    user_id INTEGER REFERENCES users(id),
    entry_fee INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_entry_fee CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
);

CREATE INDEX idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX idx_tournament_entries_tournament ON tournament_entries(tournament_id);

-- Add version tracking for schema changes
CREATE TABLE IF NOT EXISTS __schema_versions (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE __schema_versions IS 'Tracks database schema migration versions';
INSERT INTO __schema_versions (version) VALUES (10)
ON CONFLICT (version) DO NOTHING;

-- Version assertion check
CREATE OR REPLACE FUNCTION assert_schema_version(expected_version INT) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM __schema_versions WHERE version = expected_version
    ) THEN
        RAISE EXCEPTION 'Schema version mismatch. Expected %, found %',
            expected_version, (SELECT MAX(version) FROM __schema_versions);
    END IF;
END;
$$ LANGUAGE plpgsql;