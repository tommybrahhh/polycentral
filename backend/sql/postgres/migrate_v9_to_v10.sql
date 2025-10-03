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