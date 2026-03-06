"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const barcode_1 = require("../lib/barcode");
const router = (0, express_1.Router)();
/**
 * Helper to fetch detailed product info with category and bundle items
 */
async function getFullProduct(id) {
    const product = await db_1.default.get('SELECT p.*, c.name as categoryName FROM Product p LEFT JOIN Category c ON p.categoryId = c.id WHERE p.id = ?', [id]);
    if (!product)
        return null;
    // Format category for consistent API
    product.category = { id: product.categoryId, name: product.categoryName };
    // Fetch bundle items if it's a bundle
    if (product.isBundle) {
        const bundleItems = await db_1.default.all(`
            SELECT bi.*, p.name, p.price, p.barcode, p.imageUrl, p.stockQty
            FROM BundleItem bi
            JOIN Product p ON bi.productId = p.id
            WHERE bi.bundleId = ?
        `, [id]);
        product.bundleItems = bundleItems.map(bi => ({
            ...bi,
            product: {
                id: bi.productId,
                name: bi.name,
                price: bi.price,
                barcode: bi.barcode,
                imageUrl: bi.imageUrl,
                stockQty: bi.stockQty
            }
        }));
    }
    else {
        product.bundleItems = [];
    }
    return product;
}
// GET all products
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const products = await db_1.default.all(`
            SELECT p.*, c.name as categoryName
            FROM Product p
            LEFT JOIN Category c ON p.categoryId = c.id
            WHERE p.isArchived = 0
            ORDER BY p.createdAt DESC
        `);
        // Attach bundle items for each product (this can be optimized but keeping it simple for now)
        for (const p of products) {
            p.category = { id: p.categoryId, name: p.categoryName };
            p.bundleItems = []; // Simplification for general list
        }
        res.json(products);
    }
    catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});
// GET search products
router.get('/search', auth_1.authenticate, async (req, res) => {
    try {
        const { q, categoryId, barcode, sortBy, archived } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 100;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE p.isArchived = ' + (archived === 'true' ? '1' : '0');
        const params = [];
        if (q) {
            whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ? OR p.serialNumber LIKE ?)';
            const search = `%${q}%`;
            params.push(search, search, search, search);
        }
        if (categoryId) {
            whereClause += ' AND p.categoryId = ?';
            params.push(Number(categoryId));
        }
        if (barcode) {
            whereClause += ' AND p.barcode = ?';
            params.push(String(barcode));
        }
        let orderBy = 'ORDER BY p.createdAt DESC';
        if (sortBy === 'oldest')
            orderBy = 'ORDER BY p.createdAt ASC';
        if (sortBy === 'price-asc')
            orderBy = 'ORDER BY p.price ASC';
        if (sortBy === 'price-desc')
            orderBy = 'ORDER BY p.price DESC';
        if (sortBy === 'stock-asc')
            orderBy = 'ORDER BY p.stockQty ASC';
        if (sortBy === 'stock-desc')
            orderBy = 'ORDER BY p.stockQty DESC';
        if (sortBy === 'name-asc')
            orderBy = 'ORDER BY p.name ASC';
        if (sortBy === 'name-desc')
            orderBy = 'ORDER BY p.name DESC';
        const totalResult = await db_1.default.get(`SELECT COUNT(*) as total FROM Product p ${whereClause}`, params);
        const total = totalResult.total;
        const products = await db_1.default.all(`
            SELECT p.*, c.name as categoryName
            FROM Product p
            LEFT JOIN Category c ON p.categoryId = c.id
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);
        for (const p of products) {
            p.category = { id: p.categoryId, name: p.categoryName };
            // Optional: load bundles for search results if UI needs it
        }
        res.json({
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    }
    catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ error: 'Failed to search products.', details: error.message });
    }
});
// GET single product
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const product = await getFullProduct(Number(req.params.id));
        if (!product) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        res.json(product);
    }
    catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});
// POST create product
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'STAFF'), upload_1.upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stockQty, categoryId, barcode, serialNumber } = req.body;
        const finalBarcode = barcode || (0, barcode_1.generateBarcodeString)();
        // Check barcode uniqueness
        const existing = await db_1.default.get('SELECT id FROM Product WHERE barcode = ?', [finalBarcode]);
        if (existing) {
            res.status(400).json({ error: 'Barcode already exists.' });
            return;
        }
        const barcodeImageUrl = await (0, barcode_1.generateBarcodeImage)(finalBarcode);
        const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
        const isBundle = req.body.isBundle === 'true' || req.body.isBundle === true ? 1 : 0;
        const bundleItemsData = req.body.bundleItems ? JSON.parse(req.body.bundleItems) : [];
        const result = await db_1.default.transaction(async (tx) => {
            const { id } = await tx.run(`INSERT INTO Product (name, description, price, discountPrice, barcode, serialNumber, imageUrl, stockQty, isBundle, categoryId) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [name, description || '', parseFloat(price), req.body.discountPrice ? parseFloat(req.body.discountPrice) : null, finalBarcode, serialNumber || null, imageUrl, parseInt(stockQty) || 0, isBundle, parseInt(categoryId)]);
            if (isBundle && bundleItemsData.length > 0) {
                for (const item of bundleItemsData) {
                    await tx.run('INSERT INTO BundleItem (bundleId, productId, quantity) VALUES (?, ?, ?)', [id, item.productId, item.quantity]);
                }
            }
            return id;
        });
        const product = await getFullProduct(result);
        res.status(201).json({ ...product, barcodeImageUrl });
    }
    catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});
// PUT update product
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'STAFF'), upload_1.upload.single('image'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, description, price, stockQty, categoryId, barcode, serialNumber } = req.body;
        const fields = [];
        const params = [];
        if (name !== undefined) {
            fields.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            params.push(description);
        }
        if (price !== undefined) {
            fields.push('price = ?');
            params.push(parseFloat(price));
        }
        if (req.body.discountPrice !== undefined) {
            fields.push('discountPrice = ?');
            params.push(req.body.discountPrice === '' ? null : parseFloat(req.body.discountPrice));
        }
        if (stockQty !== undefined) {
            fields.push('stockQty = ?');
            params.push(parseInt(stockQty));
        }
        if (barcode !== undefined) {
            fields.push('barcode = ?');
            params.push(barcode);
        }
        if (serialNumber !== undefined) {
            fields.push('serialNumber = ?');
            params.push(serialNumber === '' ? null : serialNumber);
        }
        if (req.body.isBundle !== undefined) {
            fields.push('isBundle = ?');
            params.push(req.body.isBundle === 'true' || req.body.isBundle === true ? 1 : 0);
        }
        if (categoryId !== undefined) {
            fields.push('categoryId = ?');
            params.push(parseInt(categoryId));
        }
        if (req.file) {
            fields.push('imageUrl = ?');
            params.push(`/uploads/products/${req.file.filename}`);
        }
        const bundleItemsData = req.body.bundleItems ? JSON.parse(req.body.bundleItems) : null;
        await db_1.default.transaction(async (tx) => {
            if (fields.length > 0) {
                params.push(id);
                await tx.run(`UPDATE Product SET ${fields.join(', ')} WHERE id = ?`, params);
            }
            if (bundleItemsData !== null) {
                await tx.run('DELETE FROM BundleItem WHERE bundleId = ?', [id]);
                for (const item of bundleItemsData) {
                    await tx.run('INSERT INTO BundleItem (bundleId, productId, quantity) VALUES (?, ?, ?)', [id, item.productId, item.quantity]);
                }
            }
        });
        const product = await getFullProduct(id);
        res.json(product);
    }
    catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});
// DELETE product (Permanent)
router.delete('/permanent-delete/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const productId = Number(req.params.id);
        await db_1.default.transaction(async (tx) => {
            await tx.run('DELETE FROM BundleItem WHERE productId = ?', [productId]);
            await tx.run('DELETE FROM BundleItem WHERE bundleId = ?', [productId]);
            await tx.run('DELETE FROM Product WHERE id = ?', [productId]);
        });
        res.json({ message: 'Product permanently deleted successfully.' });
    }
    catch (error) {
        console.error('Permanent delete error:', error);
        if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
            return void res.status(400).json({
                error: 'Cannot delete product with sales history.',
                details: 'This product is linked to existing transactions. Use Archive instead.'
            });
        }
        res.status(500).json({ error: 'Failed to permanently delete product.', details: error.message });
    }
});
// DELETE product (Archive)
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        await db_1.default.run('UPDATE Product SET isArchived = 1 WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: 'Product archived successfully.' });
    }
    catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});
// POST bulk delete products
router.post('/bulk-delete', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'No product IDs provided' });
            return;
        }
        const query = `UPDATE Product SET isArchived = 1 WHERE id IN (${ids.map(() => '?').join(',')})`;
        await db_1.default.run(query, ids.map(Number));
        res.json({ message: `${ids.length} products archived successfully.` });
    }
    catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete products.' });
    }
});
// GET archived products
router.get('/archived', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const products = await db_1.default.all('SELECT p.*, c.name as categoryName FROM Product p LEFT JOIN Category c ON p.categoryId = c.id WHERE p.isArchived = 1 ORDER BY p.createdAt DESC');
        for (const p of products) {
            p.category = { id: p.categoryId, name: p.categoryName };
        }
        res.json(products);
    }
    catch (error) {
        console.error('Get archived products error:', error);
        res.status(500).json({ error: 'Failed to fetch archived products.' });
    }
});
// PUT restore product
router.put('/restore/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        await db_1.default.run('UPDATE Product SET isArchived = 0 WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: 'Product restored successfully.' });
    }
    catch (error) {
        console.error('Restore product error:', error);
        res.status(500).json({ error: 'Failed to restore product.' });
    }
});
// POST bulk restore products
router.post('/bulk-restore', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'No product IDs provided' });
            return;
        }
        const query = `UPDATE Product SET isArchived = 0 WHERE id IN (${ids.map(() => '?').join(',')})`;
        await db_1.default.run(query, ids.map(Number));
        res.json({ message: `${ids.length} products restored successfully.` });
    }
    catch (error) {
        console.error('Bulk restore error:', error);
        res.status(500).json({ error: 'Failed to restore products.' });
    }
});
// POST bulk permanent delete
router.post('/bulk-delete-permanent', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'No product IDs provided' });
            return;
        }
        const productIds = ids.map(Number);
        const placeholders = productIds.map(() => '?').join(',');
        await db_1.default.transaction(async (tx) => {
            await tx.run(`DELETE FROM BundleItem WHERE productId IN (${placeholders})`, productIds);
            await tx.run(`DELETE FROM BundleItem WHERE bundleId IN (${placeholders})`, productIds);
            await tx.run(`DELETE FROM Product WHERE id IN (${placeholders})`, productIds);
        });
        res.json({ message: `${ids.length} products permanently deleted.` });
    }
    catch (error) {
        console.error('Bulk permanent delete error:', error);
        if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
            return void res.status(400).json({
                error: 'Some products have sales history.',
                details: 'Archive them instead.'
            });
        }
        res.status(500).json({ error: 'Failed to permanently delete products.', details: error.message });
    }
});
// GET barcode image for a product
router.get('/:id/barcode', auth_1.authenticate, async (req, res) => {
    try {
        const product = await db_1.default.get('SELECT barcode FROM Product WHERE id = ?', [Number(req.params.id)]);
        if (!product) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        const barcodeImageUrl = await (0, barcode_1.generateBarcodeImage)(product.barcode);
        res.json({ barcode: product.barcode, barcodeImageUrl });
    }
    catch (error) {
        console.error('Barcode error:', error);
        res.status(500).json({ error: 'Failed to generate barcode.' });
    }
});
// POST bulk import products
router.post('/import', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const { products } = req.body;
        if (!Array.isArray(products) || products.length === 0) {
            res.status(400).json({ error: 'No products provided' });
            return;
        }
        for (const p of products) {
            const name = p.name || p.Name;
            if (!name)
                continue;
            const categoryName = p.categoryName || p.Category || 'General';
            let cat = await db_1.default.get('SELECT id FROM Category WHERE name = ?', [categoryName]);
            if (!cat) {
                const { id } = await db_1.default.run('INSERT INTO Category (name) VALUES (?)', [categoryName]);
                cat = { id };
            }
            const barcode = p.barcode || (0, barcode_1.generateBarcodeString)();
            const price = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
            const discountPrice = p.discountPrice ? (parseFloat(String(p.discountPrice).replace(/[^0-9.]/g, '')) || null) : null;
            const stockQty = parseInt(String(p.stockQty).replace(/[^0-9]/g, '')) || 0;
            const description = p.description || '';
            const serialNumber = p.serialNumber && p.serialNumber !== 'N/A' ? String(p.serialNumber) : null;
            const existing = await db_1.default.get('SELECT id FROM Product WHERE barcode = ?', [barcode]);
            if (existing) {
                await db_1.default.run('UPDATE Product SET name = ?, description = ?, price = ?, discountPrice = ?, stockQty = ?, categoryId = ?, serialNumber = ? WHERE barcode = ?', [name, description, price, discountPrice, stockQty, cat.id, serialNumber, barcode]);
            }
            else {
                await db_1.default.run('INSERT INTO Product (name, description, price, discountPrice, stockQty, categoryId, serialNumber, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [name, description, price, discountPrice, stockQty, cat.id, serialNumber, barcode]);
            }
        }
        res.json({ message: `Successfully imported products.` });
    }
    catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import products.', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map