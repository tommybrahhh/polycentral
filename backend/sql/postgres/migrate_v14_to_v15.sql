-- Add platform fee tracking columns
ALTER TABLE events ADD COLUMN platform_fee INTEGER NOT NULL DEFAULT 0;

-- Create platform fees tracking table
CREATE TABLE IF NOT EXISTS platform_fees (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    fee_amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_fees_event ON platform_fees(event_id);