import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'dev.db');

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

/**
 * Executes a query that returns multiple rows.
 */
export function all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows as T[]);
        });
    });
}

/**
 * Executes a query that returns a single row.
 */
export function get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve((row as T) || null);
        });
    });
}

/**
 * Executes a query (INSERT, UPDATE, DELETE).
 */
export function run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

/**
 * Executes a transaction.
 * Note: Since we use a single connection, we must ensure transactions don't overlap.
 */
let transactionQueue: Promise<any> = Promise.resolve();

export async function transaction<T>(callback: (tx: {
    run: typeof run,
    get: typeof get,
    all: typeof all
}) => Promise<T>): Promise<T> {
    // Queue the transaction to avoid interleaving with other transactions on the same connection
    const currentTransaction = transactionQueue.then(async () => {
        try {
            console.log('--- TRANSACTION START ---');
            await run('BEGIN TRANSACTION');
            const result = await callback({ run, get, all });
            await run('COMMIT');
            console.log('--- TRANSACTION COMMIT ---');
            return result;
        } catch (error) {
            console.error('--- TRANSACTION ROLLBACK (Error: ' + (error as any).message + ') ---');
            try {
                await run('ROLLBACK');
            } catch (rollbackErr) {
                console.error('Rollback failed:', rollbackErr);
            }
            throw error;
        }
    });

    transactionQueue = currentTransaction.catch(() => { });
    return currentTransaction;
}

/**
 * Database initialization and migration logic.
 */
export async function dbInit() {
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
            isPosOpen BOOLEAN DEFAULT 1,
            carouselSpeed INTEGER DEFAULT 5000,
            carouselTimeout INTEGER DEFAULT 30000,
            carouselEnabled BOOLEAN DEFAULT 0,
            carouselImages TEXT DEFAULT '[]',
            carouselClockPosition TEXT DEFAULT 'bottom-center',
            carouselImageFit TEXT DEFAULT 'contain'
        );

        CREATE TABLE IF NOT EXISTS Quotation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cashierId INTEGER NOT NULL,
            clientName TEXT,
            totalAmount REAL NOT NULL,
            discount REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cashierId) REFERENCES User(id)
        );

        CREATE TABLE IF NOT EXISTS QuotationItem (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quotationId INTEGER NOT NULL,
            productId INTEGER,
            description TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (quotationId) REFERENCES Quotation(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES Product(id)
        );
    `;

    // Execute schema creation
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            db.run('PRAGMA journal_mode = WAL');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Schema initialization failed', err);
                    reject(err);
                } else {
                    console.log('Database schema initialized (WAL mode enabled)');
                    resolve();
                }
            });
        });
    });
}

export default { all, get, run, transaction, dbInit };
