
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.cwd(), 'dev.db');
const db = new sqlite3.Database(dbPath);

const newPassword = 'admin123';

async function reset() {
    console.log('Resetting admin password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.run('UPDATE User SET password = ? WHERE email = ?', [hashedPassword, 'admin@gmail.com'], function (err) {
        if (err) {
            console.error('Error updating password:', err);
        } else {
            console.log(`Success! Admin password for admin@gmail.com reset to: ${newPassword}`);
            console.log(`Rows affected: ${this.changes}`);
        }
        db.close();
    });
}

reset();
