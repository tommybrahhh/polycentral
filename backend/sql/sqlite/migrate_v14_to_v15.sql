-- Migration v14 to v15: Additional platform fee tracking for SQLite
-- This migration ensures the platform_fee column exists on the events table
-- and that the platform_fees table is properly set up

-- For SQLite, we'll rely on the application's ensureEventsTableIntegrity function
-- to handle column additions, as SQLite migrations are more complex for column operations

-- Ensure platform_fees table exists
CREATE TABLE IF NOT EXISTS platform_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    fee_amount INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_fees_event ON platform_fees(event_id);