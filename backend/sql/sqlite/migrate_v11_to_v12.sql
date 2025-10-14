-- Migration v11 to v12: Create event_outcomes table for SQLite
CREATE TABLE IF NOT EXISTS event_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    points_awarded INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_outcomes_participant ON event_outcomes(participant_id);