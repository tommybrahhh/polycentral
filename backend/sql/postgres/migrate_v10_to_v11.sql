-- Add prediction tracking columns
ALTER TABLE participants
ADD COLUMN prediction VARCHAR(10),
ADD COLUMN settled BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for faster settlement queries
CREATE INDEX idx_participants_unsettled ON participants (event_id) 
WHERE settled = FALSE;