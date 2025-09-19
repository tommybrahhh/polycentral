CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    wallet_address TEXT UNIQUE,
    points INTEGER DEFAULT 1000,
    total_events INTEGER DEFAULT 0,
    won_events INTEGER DEFAULT 0,
    last_claim_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_wallet
ON users(wallet_address);

CREATE TABLE IF NOT EXISTS event_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    options TEXT,
    entry_fee INTEGER NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 100,
    current_participants INTEGER NOT NULL DEFAULT 0,
    prize_pool INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status TEXT DEFAULT 'pending',
    correct_answer TEXT,
    event_type_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    crypto_symbol TEXT DEFAULT 'bitcoin',
    initial_price DECIMAL,
    final_price DECIMAL,
    resolution_status TEXT CHECK (resolution_status IN ('pending', 'resolved')),
    prediction_window INTERVAL DEFAULT '24 hours'
);

CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    prediction TEXT NOT NULL,
    points_paid INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participants_event_user
ON participants(event_id, user_id);