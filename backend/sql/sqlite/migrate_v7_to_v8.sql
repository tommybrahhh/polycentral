-- Migration v7 to v8: SQLite column rename workaround
PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

CREATE TABLE participants_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    prediction TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

INSERT INTO participants_new (id, event_id, user_id, amount, prediction, created_at)
SELECT id, event_id, user_id, points_paid AS amount, prediction, created_at 
FROM participants;

DROP TABLE participants;
ALTER TABLE participants_new RENAME TO participants;

COMMIT;
PRAGMA foreign_keys=ON;