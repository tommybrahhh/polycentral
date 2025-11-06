const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('Checking query plan for leaderboard query...');
db.all('EXPLAIN QUERY PLAN SELECT id, username, points FROM users ORDER BY points DESC LIMIT 20', (err, rows) => {
    if (err) {
        console.error('Error checking query plan:', err);
    } else {
        console.log('Query plan:');
        rows.forEach(row => console.log(row.detail));
    }
    db.close();
});