
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking User table...');
db.all('SELECT id, name, email, role FROM User', (err, rows) => {
    if (err) {
        console.error('Error reading User table:', err);
    } else {
        console.log('Users found:', rows);
    }
    db.close();
});
