/**
 * Executes a query that returns multiple rows.
 */
export declare function all<T>(sql: string, params?: any[]): Promise<T[]>;
/**
 * Executes a query that returns a single row.
 */
export declare function get<T>(sql: string, params?: any[]): Promise<T | null>;
/**
 * Executes a query (INSERT, UPDATE, DELETE).
 */
export declare function run(sql: string, params?: any[]): Promise<{
    id: number;
    changes: number;
}>;
/**
 * Executes a transaction.
 */
export declare function transaction<T>(callback: (db: {
    run: typeof run;
    get: typeof get;
    all: typeof all;
}) => Promise<T>): Promise<T>;
/**
 * Database initialization and migration logic.
 */
export declare function dbInit(): Promise<void>;
declare const _default: {
    all: typeof all;
    get: typeof get;
    run: typeof run;
    transaction: typeof transaction;
    dbInit: typeof dbInit;
};
export default _default;
//# sourceMappingURL=db.d.ts.map