PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Create tournaments table with enhanced constraints
CREATE TABLE tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    entry_fee INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    CHECK (entry_fee >= 100 AND entry_fee % 25 = 0)
);

-- Tournament participants junction table
CREATE TABLE tournament_participants (
    tournament_id INTEGER,
    user_id INTEGER,
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tournament entries with points tracking
CREATE TABLE tournament_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    user_id INTEGER,
    entry_fee INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    CHECK (entry_fee >= 100 AND entry_fee % 25 = 0),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tournament_entries_user ON tournament_entries(user_id);
CREATE INDEX idx_tournament_entries_tournament ON tournament_entries(tournament_id);

COMMIT;

PRAGMA foreign_keys=on;