
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT email FROM User WHERE role = "ADMIN"', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Admin emails:', rows);
    }
    db.close();
});
