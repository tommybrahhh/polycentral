-- Migration v16 to v17: Add points_history table for tracking point transactions

-- This script creates the table to log all points transactions.
CREATE TABLE points_history (
    id SERIAL PRIMARY KEY,

    -- Foreign key to your existing 'users' table.
    -- Assuming the primary key of 'users' is 'id'.
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- The amount points changed by. Can be positive or negative.
    change_amount INTEGER NOT NULL,

    -- The user's new total balance after this transaction.
    new_balance INTEGER NOT NULL,

    -- A code for the reason of the transaction.
    reason VARCHAR(50) NOT NULL, -- e.g., 'event_entry', 'event_win', 'daily_claim'

    -- Foreign key to your existing 'events' table. Nullable.
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,

    -- Timestamp for when the transaction occurred.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- An index to speed up queries for a specific user's history.
CREATE INDEX idx_points_history_user_id ON points_history(user_id);