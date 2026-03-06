"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const users_1 = __importDefault(require("./routes/users"));
const settings_1 = __importDefault(require("./routes/settings"));
const db_1 = __importDefault(require("./lib/db"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001; // Reloaded for new routes
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static files for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/users', users_1.default);
app.use('/api/settings', settings_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    try {
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
        fs.appendFileSync('server_errors.log', logMsg);
    }
    catch (logErr) {
        console.error('Failed to log to file:', logErr);
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
});
// Initialize DB and start server
async function startServer() {
    try {
        await db_1.default.dbInit();
        app.listen(PORT, () => {
            console.log(`🚀 AZTECH Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server due to database error:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map