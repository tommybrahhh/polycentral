-- Add last_claimed and last_login_date columns to users table for tracking free points claims and user activity
ALTER TABLE users ADD COLUMN last_claimed TEXT;
ALTER TABLE users ADD COLUMN last_login_date TEXT;

-- Rename points_paid column to amount in participants table for consistency with application code
-- SQLite doesn't support RENAME COLUMN directly, so we use the standard workaround
-- 1. Create new table with desired schema
CREATE TABLE participants_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    prediction TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Copy data from old table to new table
INSERT INTO participants_new (id, event_id, user_id, prediction, amount, created_at)
SELECT id, event_id, user_id, prediction, points_paid, created_at FROM participants;

-- 3. Drop old table
DROP TABLE participants;

-- 4. Rename new table to original name
ALTER TABLE participants_new RENAME TO participants;