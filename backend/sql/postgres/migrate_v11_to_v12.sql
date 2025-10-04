-- Migration v11 to v12: Rename tournament tables to event tables
BEGIN;

-- Rename tables
ALTER TABLE IF EXISTS tournaments RENAME TO events;
ALTER TABLE IF EXISTS tournament_participants RENAME TO event_participants;
ALTER TABLE IF EXISTS tournament_entries RENAME TO event_entries;

-- Rename constraints
ALTER TABLE IF EXISTS event_participants RENAME CONSTRAINT fk_tournament_id TO fk_event_id;

-- Rename indexes
ALTER INDEX IF EXISTS idx_tournament_entries_user RENAME TO idx_event_entries_user;
ALTER INDEX IF EXISTS idx_tournament_entries_tournament RENAME TO idx_event_entries_event;

-- Update schema version
INSERT INTO schema_versions (version) VALUES (12);

COMMIT;