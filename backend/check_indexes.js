const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT name FROM sqlite_master WHERE type = "index" AND name LIKE "%users_points%"', (err, rows) => {
    if (err) {
        console.error('Error checking indexes:', err);
    } else {
        console.log('Indexes on users.points:', rows);
    }
    db.close();
});