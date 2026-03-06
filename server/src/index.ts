import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import quotationRoutes from './routes/quotations';
import { getBarcodeBuffer } from './lib/barcode';

import db from './lib/db';

const app = express();
const PORT = process.env.PORT || 3001; // Reloaded for new routes

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/quotations', quotationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PUBLIC Barcode generator (No DB, No Auth, No Disk)
app.get('/api/barcode/generate/:text', async (req, res) => {
    try {
        const { text } = req.params;
        if (!text) {
            return res.status(400).send('Barcode text is required');
        }
        const buffer = await getBarcodeBuffer(text);
        res.type('png').send(buffer);
    } catch (error) {
        console.error('Direct barcode generation error:', error);
        res.status(500).send('Failed to generate barcode');
    }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    try {
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
        fs.appendFileSync('server_errors.log', logMsg);
    } catch (logErr) {
        console.error('Failed to log to file:', logErr);
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Initialize DB and start server
async function startServer() {
    try {
        await db.dbInit();
        app.listen(PORT, () => {
            console.log(`🚀 AZTECH Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server due to database error:', error);
        process.exit(1);
    }
}

startServer();

export default app;
