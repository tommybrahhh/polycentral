-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we recreate the table
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Create new table with constraint
CREATE TABLE tournaments_new (
    -- Existing columns remain the same
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    options TEXT,
    entry_fee INTEGER NOT NULL CHECK (entry_fee >= 100 AND entry_fee % 25 = 0),
    -- ... other columns ...
    
    -- Maintain existing constraints
    CHECK (status IN ('active', 'completed', 'canceled'))
);

-- Copy data from old table
INSERT INTO tournaments_new SELECT * FROM tournaments;

-- Drop old table and rename new one
DROP TABLE tournaments;
ALTER TABLE tournaments_new RENAME TO tournaments;

COMMIT;

PRAGMA foreign_keys=on;