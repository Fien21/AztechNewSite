"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST create transaction (POS checkout)
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'CASHIER'), async (req, res) => {
    try {
        const { items, discount } = req.body;
        // Check if POS is open
        const settings = await db_1.default.get('SELECT * FROM Settings LIMIT 1');
        if (settings && !settings.isPosOpen && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Point of Sale is currently closed.' });
            return;
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Transaction must have at least one item.' });
            return;
        }
        // Calculate total and validate stock
        let totalAmount = 0;
        const itemsData = [];
        for (const item of items) {
            const product = await db_1.default.get('SELECT * FROM Product WHERE id = ?', [item.productId]);
            if (!product) {
                res.status(400).json({ error: `Product ID ${item.productId} not found.` });
                return;
            }
            // Validate stock
            if (product.isBundle) {
                const bundleItems = await db_1.default.all('SELECT bi.*, p.name, p.stockQty FROM BundleItem bi JOIN Product p ON bi.productId = p.id WHERE bi.bundleId = ?', [product.id]);
                for (const bi of bundleItems) {
                    const requiredQty = bi.quantity * item.quantity;
                    if (bi.stockQty < requiredQty) {
                        res.status(400).json({ error: `Insufficient stock for bundle component ${bi.name}. Required: ${requiredQty}, Available: ${bi.stockQty}` });
                        return;
                    }
                }
            }
            else {
                if (product.stockQty < item.quantity) {
                    res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stockQty}` });
                    return;
                }
            }
            const price = product.discountPrice !== null ? product.discountPrice : product.price;
            const subtotal = price * item.quantity;
            totalAmount += subtotal;
            itemsData.push({
                productId: product.id,
                quantity: item.quantity,
                price: price,
                subtotal,
                name: product.name,
                isBundle: !!product.isBundle
            });
        }
        const discountAmount = discount || 0;
        totalAmount = totalAmount - discountAmount;
        // Create transaction and deduct stock in a transaction
        const resultId = await db_1.default.transaction(async (tx) => {
            const { id: transactionId } = await tx.run('INSERT INTO Transaction_Table (cashierId, totalAmount, discount) VALUES (?, ?, ?)', [req.user.id, totalAmount, discountAmount]);
            for (const item of itemsData) {
                await tx.run('INSERT INTO TransactionItem (transactionId, productId, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)', [transactionId, item.productId, item.quantity, item.price, item.subtotal]);
                // Deduct stock
                if (item.isBundle) {
                    const bundleItemsArr = await tx.all('SELECT * FROM BundleItem WHERE bundleId = ?', [item.productId]);
                    for (const bi of bundleItemsArr) {
                        await tx.run('UPDATE Product SET stockQty = stockQty - ? WHERE id = ?', [bi.quantity * item.quantity, bi.productId]);
                    }
                }
                else {
                    await tx.run('UPDATE Product SET stockQty = stockQty - ? WHERE id = ?', [item.quantity, item.productId]);
                }
            }
            return transactionId;
        });
        const finalTxn = await db_1.default.get(`
            SELECT t.*, u.name as cashierName 
            FROM Transaction_Table t 
            JOIN User u ON t.cashierId = u.id 
            WHERE t.id = ?
        `, [resultId]);
        const finalItems = await db_1.default.all(`
            SELECT ti.*, p.name as productName 
            FROM TransactionItem ti 
            JOIN Product p ON ti.productId = p.id 
            WHERE ti.transactionId = ?
        `, [resultId]);
        res.status(201).json({
            ...finalTxn,
            cashier: { name: finalTxn.cashierName },
            items: finalItems.map(i => ({ ...i, product: { name: i.productName } }))
        });
    }
    catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Failed to create transaction.' });
    }
});
// GET all transactions
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { startDate, endDate, cashierId } = req.query;
        let whereClause = 'WHERE 1=1';
        const params = [];
        if (startDate && endDate) {
            whereClause += ' AND t.createdAt BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        if (cashierId) {
            whereClause += ' AND t.cashierId = ?';
            params.push(Number(cashierId));
        }
        // Non-admin cashiers can only see their own transactions
        if (req.user.role === 'CASHIER') {
            whereClause += ' AND t.cashierId = ?';
            params.push(req.user.id);
        }
        const transactions = await db_1.default.all(`
            SELECT t.*, u.name as cashierName, u.email as cashierEmail
            FROM Transaction_Table t
            JOIN User u ON t.cashierId = u.id
            ${whereClause}
            ORDER BY t.createdAt DESC
        `, params);
        for (const txn of transactions) {
            txn.cashier = { name: txn.cashierName, email: txn.cashierEmail };
            const items = await db_1.default.all(`
                SELECT ti.*, p.name as productName
                FROM TransactionItem ti
                JOIN Product p ON ti.productId = p.id
                WHERE ti.transactionId = ?
            `, [txn.id]);
            txn.items = items.map((i) => ({ ...i, product: { name: i.productName } }));
        }
        res.json(transactions);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions.' });
    }
});
// GET single transaction
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const transaction = await db_1.default.get(`
            SELECT t.*, u.name as cashierName, u.email as cashierEmail
            FROM Transaction_Table t
            JOIN User u ON t.cashierId = u.id
            WHERE t.id = ?
        `, [id]);
        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found.' });
            return;
        }
        transaction.cashier = { name: transaction.cashierName, email: transaction.cashierEmail };
        const items = await db_1.default.all(`
            SELECT ti.*, p.name as productName
            FROM TransactionItem ti
            JOIN Product p ON ti.productId = p.id
            WHERE ti.transactionId = ?
        `, [id]);
        transaction.items = items.map((i) => ({ ...i, product: { name: i.productName } }));
        res.json(transaction);
    }
    catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction.' });
    }
});
// GET dashboard stats
router.get('/stats/dashboard', auth_1.authenticate, async (req, res) => {
    try {
        const productStats = await db_1.default.get('SELECT COUNT(*) as totalProducts, (SELECT COUNT(*) FROM Product WHERE stockQty <= 10) as lowStockProducts FROM Product');
        const { count: totalTransactions } = await db_1.default.get('SELECT COUNT(*) as count FROM Transaction_Table');
        const { count: totalCategories } = await db_1.default.get('SELECT COUNT(*) as count FROM Category');
        // Today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        const todaySales = await db_1.default.get(`
            SELECT SUM(totalAmount) as totalAmount, COUNT(*) as count 
            FROM Transaction_Table 
            WHERE createdAt >= ?
        `, [todayStr]);
        // Recent transactions
        const recentTransactions = await db_1.default.all(`
            SELECT t.*, u.name as cashierName, (SELECT COUNT(*) FROM TransactionItem WHERE transactionId = t.id) as item_count
            FROM Transaction_Table t
            JOIN User u ON t.cashierId = u.id
            ORDER BY t.createdAt DESC
            LIMIT 5
        `);
        res.json({
            totalProducts: productStats.totalProducts,
            lowStockProducts: productStats.lowStockProducts,
            totalTransactions,
            totalCategories,
            todaySalesAmount: todaySales.totalAmount || 0,
            todaySalesCount: todaySales.count,
            recentTransactions: recentTransactions.map(t => ({
                ...t,
                cashier: { name: t.cashierName },
                _count: { items: t.item_count }
            })),
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
    }
});
// GET chart data
router.get('/stats/charts', auth_1.authenticate, async (req, res) => {
    try {
        const { interval = 'week' } = req.query;
        const now = new Date();
        let startDate = new Date();
        if (interval === 'day')
            startDate.setHours(now.getHours() - 24);
        else if (interval === 'week')
            startDate.setDate(now.getDate() - 7);
        else if (interval === 'month')
            startDate.setDate(now.getDate() - 30);
        else if (interval === 'year')
            startDate.setFullYear(now.getFullYear() - 1);
        const startDateStr = startDate.toISOString();
        const transactions = await db_1.default.all(`
            SELECT t.*, (SELECT SUM(quantity) FROM TransactionItem WHERE transactionId = t.id) as units
            FROM Transaction_Table t
            WHERE createdAt >= ?
            ORDER BY createdAt ASC
        `, [startDateStr]);
        // Simple aggregation logic
        const dataMap = {};
        transactions.forEach(txn => {
            const date = new Date(txn.createdAt);
            let key = '';
            let label = '';
            if (interval === 'day') {
                key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
                label = date.toLocaleTimeString([], { hour: '2-digit', hour12: true });
            }
            else if (interval === 'year') {
                key = date.toISOString().substring(0, 7); // YYYY-MM
                label = date.toLocaleDateString([], { month: 'short', year: '2-digit' });
            }
            else {
                key = date.toISOString().substring(0, 10); // YYYY-MM-DD
                label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
            if (!dataMap[key]) {
                dataMap[key] = { label, sales: 0, units: 0 };
            }
            dataMap[key].sales += txn.totalAmount;
            dataMap[key].units += txn.units || 0;
        });
        res.json(Object.values(dataMap));
    }
    catch (error) {
        console.error('Chart stats error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data.' });
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map