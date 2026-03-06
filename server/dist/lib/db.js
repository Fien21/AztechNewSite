"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.get = get;
exports.run = run;
exports.transaction = transaction;
exports.dbInit = dbInit;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.resolve(process.cwd(), 'dev.db');
// Connect to SQLite database
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    }
    else {
        console.log('Connected to SQLite database');
    }
});
/**
 * Executes a query that returns multiple rows.
 */
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
/**
 * Executes a query that returns a single row.
 */
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row || null);
        });
    });
}
/**
 * Executes a query (INSERT, UPDATE, DELETE).
 */
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
/**
 * Executes a transaction.
 */
async function transaction(callback) {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                db.run('BEGIN TRANSACTION');
                const result = await callback({ run, get, all });
                db.run('COMMIT', (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(result);
                });
            }
            catch (error) {
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
}
/**
 * Database initialization and migration logic.
 */
async function dbInit() {
    console.log('Initializing database schema...');
    const schema = `
        CREATE TABLE IF NOT EXISTS User (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'CASHIER',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Category (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Product (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL,
            discountPrice REAL,
            barcode TEXT UNIQUE NOT NULL,
            serialNumber TEXT UNIQUE,
            imageUrl TEXT,
            stockQty INTEGER DEFAULT 0,
            isBundle BOOLEAN DEFAULT 0,
            categoryId INTEGER NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            isArchived BOOLEAN DEFAULT 0,
            FOREIGN KEY (categoryId) REFERENCES Category(id)
        );

        CREATE TABLE IF NOT EXISTS BundleItem (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bundleId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (bundleId) REFERENCES Product(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES Product(id)
        );

        CREATE TABLE IF NOT EXISTS Transaction_Table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cashierId INTEGER NOT NULL,
            totalAmount REAL NOT NULL,
            discount REAL DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cashierId) REFERENCES User(id)
        );

        CREATE TABLE IF NOT EXISTS TransactionItem (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transactionId INTEGER NOT NULL,
            productId INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (transactionId) REFERENCES Transaction_Table(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES Product(id)
        );

        CREATE TABLE IF NOT EXISTS Settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            isPosOpen BOOLEAN DEFAULT 1
        );
    `;
    // Execute schema creation
    return new Promise((resolve, reject) => {
        db.exec(schema, (err) => {
            if (err) {
                console.error('Schema initialization failed', err);
                reject(err);
            }
            else {
                console.log('Database schema initialized');
                resolve();
            }
        });
    });
}
exports.default = { all, get, run, transaction, dbInit };
//# sourceMappingURL=db.js.map