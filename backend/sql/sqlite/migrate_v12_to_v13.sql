-- Migration v12 to v13: Create audit_logs table for SQLite
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL,  -- SQLite doesn't have JSONB, so we use TEXT
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_id);