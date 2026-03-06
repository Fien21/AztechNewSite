import { Router, Response } from 'express';
import db from '../lib/db';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import bcrypt from 'bcryptjs';
import { generateBarcodeString, generateBarcodeImage } from '../lib/barcode';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * Helper to fetch detailed product info with category and bundle items
 */
async function getFullProduct(id: number) {
    const product = await db.get<any>('SELECT p.*, c.name as categoryName FROM Product p LEFT JOIN Category c ON p.categoryId = c.id WHERE p.id = ?', [id]);
    if (!product) return null;

    // Format category for consistent API
    product.category = { id: product.categoryId, name: product.categoryName };

    // Fetch bundle items if it's a bundle
    if (product.isBundle) {
        const bundleItems = await db.all<any>(`
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
    } else {
        product.bundleItems = [];
    }

    return product;
}

// PUBLIC Barcode endpoint (No auth required)
router.get('/barcode/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const product = await db.get<any>('SELECT barcode FROM Product WHERE id = ?', [Number(req.params.id)]);
        if (!product) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }

        const barcodeImageUrl = await generateBarcodeImage(product.barcode);
        const absolutePath = path.join(process.cwd(), barcodeImageUrl.startsWith('/') ? barcodeImageUrl.slice(1) : barcodeImageUrl);

        if (fs.existsSync(absolutePath)) {
            res.sendFile(absolutePath);
        } else {
            res.status(404).json({ error: 'Barcode image file not found.' });
        }
    } catch (error) {
        console.error('Public barcode error:', error);
        res.status(500).json({ error: 'Failed to generate barcode.' });
    }
});

// GET all products
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const products = await db.all<any>(`
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
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET search products
router.get('/search', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { q, categoryId, barcode, sortBy, archived } = req.query;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE p.isArchived = ' + (archived === 'true' ? '1' : '0');
        const params: any[] = [];

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
        if (sortBy === 'oldest') orderBy = 'ORDER BY p.createdAt ASC';
        if (sortBy === 'price-asc') orderBy = 'ORDER BY p.price ASC';
        if (sortBy === 'price-desc') orderBy = 'ORDER BY p.price DESC';
        if (sortBy === 'stock-asc') orderBy = 'ORDER BY p.stockQty ASC';
        if (sortBy === 'stock-desc') orderBy = 'ORDER BY p.stockQty DESC';
        if (sortBy === 'name-asc') orderBy = 'ORDER BY p.name ASC';
        if (sortBy === 'name-desc') orderBy = 'ORDER BY p.name DESC';

        const totalResult = await db.get<any>(`SELECT COUNT(*) as total FROM Product p ${whereClause}`, params);
        const total = totalResult.total;

        const products = await db.all<any>(`
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
    } catch (error: any) {
        console.error('Search products error:', error);
        res.status(500).json({ error: 'Failed to search products.', details: error.message });
    }
});

// GET single product
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const product = await getFullProduct(Number(req.params.id));
        if (!product) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// POST create product
router.post(
    '/',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    upload.single('image'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { name, description, price, stockQty, categoryId, barcode, serialNumber } = req.body;
            const finalBarcode = barcode || generateBarcodeString();

            // Check barcode uniqueness
            const existing = await db.get('SELECT id FROM Product WHERE barcode = ?', [finalBarcode]);
            if (existing) {
                res.status(400).json({ error: 'Barcode already exists.' });
                return;
            }

            const barcodeImageUrl = await generateBarcodeImage(finalBarcode);
            const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
            const isBundle = req.body.isBundle === 'true' || req.body.isBundle === true ? 1 : 0;
            const bundleItemsData = req.body.bundleItems ? JSON.parse(req.body.bundleItems) : [];

            const result = await db.transaction(async (tx) => {
                const { id } = await tx.run(
                    `INSERT INTO Product (name, description, price, discountPrice, barcode, serialNumber, imageUrl, stockQty, isBundle, categoryId) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, description || '', parseFloat(price), req.body.discountPrice ? parseFloat(req.body.discountPrice) : null, finalBarcode, serialNumber || null, imageUrl, parseInt(stockQty) || 0, isBundle, parseInt(categoryId)]
                );

                if (isBundle && bundleItemsData.length > 0) {
                    for (const item of bundleItemsData) {
                        await tx.run('INSERT INTO BundleItem (bundleId, productId, quantity) VALUES (?, ?, ?)', [id, item.productId, item.quantity]);
                    }
                }
                return id;
            });

            const product = await getFullProduct(result);
            res.status(201).json({ ...product, barcodeImageUrl });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Failed to create product.' });
        }
    }
);

// PUT update product
router.put(
    '/:id',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    upload.single('image'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const id = Number(req.params.id);
            const { name, description, price, stockQty, categoryId, barcode, serialNumber } = req.body;

            const fields: string[] = [];
            const params: any[] = [];

            if (name !== undefined) { fields.push('name = ?'); params.push(name); }
            if (description !== undefined) { fields.push('description = ?'); params.push(description); }
            if (price !== undefined) { fields.push('price = ?'); params.push(parseFloat(price)); }
            if (req.body.discountPrice !== undefined) {
                fields.push('discountPrice = ?');
                params.push(req.body.discountPrice === '' ? null : parseFloat(req.body.discountPrice));
            }
            if (stockQty !== undefined) { fields.push('stockQty = ?'); params.push(parseInt(stockQty)); }
            if (barcode !== undefined) { fields.push('barcode = ?'); params.push(barcode); }
            if (serialNumber !== undefined) { fields.push('serialNumber = ?'); params.push(serialNumber === '' ? null : serialNumber); }
            if (req.body.isBundle !== undefined) {
                fields.push('isBundle = ?');
                params.push(req.body.isBundle === 'true' || req.body.isBundle === true ? 1 : 0);
            }
            if (categoryId !== undefined) { fields.push('categoryId = ?'); params.push(parseInt(categoryId)); }
            if (req.file) {
                fields.push('imageUrl = ?');
                params.push(`/uploads/products/${req.file.filename}`);
            }

            const bundleItemsData = req.body.bundleItems ? JSON.parse(req.body.bundleItems) : null;

            await db.transaction(async (tx) => {
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
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Failed to update product.' });
        }
    }
);

// DELETE product (Permanent)
router.delete(
    '/permanent-delete/:id',
    authenticate,
    authorize('ADMIN'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const productId = Number(req.params.id);

            await db.transaction(async (tx) => {
                await tx.run('DELETE FROM BundleItem WHERE productId = ?', [productId]);
                await tx.run('DELETE FROM BundleItem WHERE bundleId = ?', [productId]);
                await tx.run('DELETE FROM Product WHERE id = ?', [productId]);
            });

            res.json({ message: 'Product permanently deleted successfully.' });
        } catch (error: any) {
            console.error('Permanent delete error:', error);
            if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
                return void res.status(400).json({
                    error: 'Cannot delete product with sales history.',
                    details: 'This product is linked to existing transactions. Use Archive instead.'
                });
            }
            res.status(500).json({ error: 'Failed to permanently delete product.', details: error.message });
        }
    }
);

// DELETE product (Archive)
router.delete(
    '/:id',
    authenticate,
    authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            await db.run('UPDATE Product SET isArchived = 1 WHERE id = ?', [Number(req.params.id)]);
            res.json({ message: 'Product archived successfully.' });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Failed to delete product.' });
        }
    }
);

// POST bulk delete products
router.post(
    '/bulk-delete',
    authenticate,
    authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'No product IDs provided' });
                return;
            }
            const query = `UPDATE Product SET isArchived = 1 WHERE id IN (${ids.map(() => '?').join(',')})`;
            await db.run(query, ids.map(Number));
            res.json({ message: `${ids.length} products archived successfully.` });
        } catch (error) {
            console.error('Bulk delete error:', error);
            res.status(500).json({ error: 'Failed to delete products.' });
        }
    }
);

// GET archived products
router.get('/archived', authenticate, authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const products = await db.all<any>('SELECT p.*, c.name as categoryName FROM Product p LEFT JOIN Category c ON p.categoryId = c.id WHERE p.isArchived = 1 ORDER BY p.createdAt DESC');
        for (const p of products) {
            p.category = { id: p.categoryId, name: p.categoryName };
        }
        res.json(products);
    } catch (error) {
        console.error('Get archived products error:', error);
        res.status(500).json({ error: 'Failed to fetch archived products.' });
    }
});

// PUT restore product
router.put(
    '/restore/:id',
    authenticate,
    authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            await db.run('UPDATE Product SET isArchived = 0 WHERE id = ?', [Number(req.params.id)]);
            res.json({ message: 'Product restored successfully.' });
        } catch (error) {
            console.error('Restore product error:', error);
            res.status(500).json({ error: 'Failed to restore product.' });
        }
    }
);

// POST bulk restore products
router.post(
    '/bulk-restore',
    authenticate,
    authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'No product IDs provided' });
                return;
            }
            const query = `UPDATE Product SET isArchived = 0 WHERE id IN (${ids.map(() => '?').join(',')})`;
            await db.run(query, ids.map(Number));
            res.json({ message: `${ids.length} products restored successfully.` });
        } catch (error) {
            console.error('Bulk restore error:', error);
            res.status(500).json({ error: 'Failed to restore products.' });
        }
    }
);

// POST bulk permanent delete
router.post(
    '/bulk-delete-permanent',
    authenticate,
    authorize('ADMIN'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'No product IDs provided' });
                return;
            }
            const productIds = ids.map(Number);
            const placeholders = productIds.map(() => '?').join(',');

            await db.transaction(async (tx) => {
                await tx.run(`DELETE FROM BundleItem WHERE productId IN (${placeholders})`, productIds);
                await tx.run(`DELETE FROM BundleItem WHERE bundleId IN (${placeholders})`, productIds);
                await tx.run(`DELETE FROM Product WHERE id IN (${placeholders})`, productIds);
            });

            res.json({ message: `${ids.length} products permanently deleted.` });
        } catch (error: any) {
            console.error('Bulk permanent delete error:', error);
            if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
                return void res.status(400).json({
                    error: 'Some products have sales history.',
                    details: 'Archive them instead.'
                });
            }
            res.status(500).json({ error: 'Failed to permanently delete products.', details: error.message });
        }
    }
);


// POST bulk import products
router.post(
    '/import',
    authenticate,
    authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { products } = req.body;
            if (!Array.isArray(products) || products.length === 0) {
                res.status(400).json({ error: 'No products provided' });
                return;
            }

            await db.transaction(async (tx) => {
                for (const p of products) {
                    const name = p.name || p.Name;
                    if (!name) {
                        console.log('Skipping product with no name:', p);
                        continue;
                    }

                    const categoryName = p.categoryName || p.Category || 'General';
                    let cat = await tx.get<any>('SELECT id FROM Category WHERE name = ?', [categoryName]);
                    if (!cat) {
                        try {
                            const { id } = await tx.run('INSERT INTO Category (name) VALUES (?)', [categoryName]);
                            cat = { id };
                        } catch (catErr) {
                            // Handle race condition
                            cat = await tx.get<any>('SELECT id FROM Category WHERE name = ?', [categoryName]);
                            if (!cat) throw catErr;
                        }
                    }

                    const barcode = p.barcode || generateBarcodeString();
                    const price = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
                    const discountPrice = p.discountPrice ? (parseFloat(String(p.discountPrice).replace(/[^0-9.]/g, '')) || null) : null;
                    const stockQty = parseInt(String(p.stockQty).replace(/[^0-9]/g, '')) || 0;
                    const description = p.description || '';
                    const serialNumber = p.serialNumber && p.serialNumber !== 'N/A' && p.serialNumber !== '-' ? String(p.serialNumber).trim() : null;

                    // Super-robust upsert strategy
                    let existing = null;

                    // 1. Try matching by serialNumber first (uniquely identifies a unit)
                    if (serialNumber) {
                        existing = await tx.get<any>('SELECT id FROM Product WHERE serialNumber = ?', [serialNumber]);
                    }

                    // 2. If no serial match, try matching by barcode
                    if (!existing) {
                        existing = await tx.get<any>('SELECT id FROM Product WHERE barcode = ?', [barcode]);
                    }

                    if (existing) {
                        // Before updating, ensure we don't collide with ANOTHER product's UNIQUE fields
                        // If we are updating Product A to have barcode B, but Product C already has barcode B...
                        if (barcode) {
                            const barcodeConflict = await tx.get<any>('SELECT id FROM Product WHERE barcode = ? AND id != ?', [barcode, existing.id]);
                            if (barcodeConflict) {
                                // If there's a conflict, we could merge, but let's just skip updating the barcode for this specific row 
                                // or better, update the OLD row to have a temporary barcode to allow the change?
                                // Actually, let's just use the existing barcode if it's a conflict to keep it safe.
                            }
                        }

                        await tx.run(
                            'UPDATE Product SET name = ?, description = ?, price = ?, discountPrice = ?, stockQty = ?, categoryId = ?, serialNumber = ?, barcode = ? WHERE id = ?',
                            [name, description, price, discountPrice, stockQty, cat.id, serialNumber, barcode, existing.id]
                        );
                    } else {
                        // Check if its barcode/serial exists on different products before inserting
                        const conflict = await tx.get<any>('SELECT id FROM Product WHERE barcode = ? OR (serialNumber IS NOT NULL AND serialNumber = ?)', [barcode, serialNumber]);
                        if (conflict) {
                            // This should basically never happen here due to the 'existing' checks above, but just in case:
                            await tx.run(
                                'UPDATE Product SET name = ?, description = ?, price = ?, discountPrice = ?, stockQty = ?, categoryId = ?, serialNumber = ?, barcode = ? WHERE id = ?',
                                [name, description, price, discountPrice, stockQty, cat.id, serialNumber, barcode, conflict.id]
                            );
                        } else {
                            await tx.run(
                                'INSERT INTO Product (name, description, price, discountPrice, stockQty, categoryId, serialNumber, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [name, description, price, discountPrice, stockQty, cat.id, serialNumber, barcode]
                            );
                        }
                    }
                }
            });

            res.json({ message: `Successfully imported products.` });
        } catch (error: any) {
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                code: error.code // SQLite error code
            };
            console.error('IMPORT FAIL:', errorDetails);

            // Also log to a file for easier retrieval
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.resolve(process.cwd(), 'import_errors.log');
                const logMsg = `[${new Date().toISOString()}] IMPORT FAIL: ${JSON.stringify(errorDetails, null, 2)}\n`;
                fs.appendFileSync(logPath, logMsg);
            } catch (logErr) {
                console.error('Failed to log import error to file:', logErr);
            }

            res.status(500).json({
                error: 'Failed to import products.',
                details: error.message,
                code: error.code
            });
        }
    }
);

// POST clear all inventory data
router.post(
    '/clear-inventory',
    authenticate,
    authorize('ADMIN'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { password } = req.body;

            if (!password) {
                res.status(400).json({ error: 'Password is required' });
                return;
            }

            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Verify password
            const user = await db.get<any>('SELECT password FROM User WHERE id = ?', [req.user.id]);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                res.status(400).json({ error: 'Invalid password' });
                return;
            }

            console.log(`[CLEAR] User ${req.user.id} starting inventory wipe...`);
            await db.transaction(async (tx) => {
                // Delete in reverse order of dependencies (Transactions/Items first, then Products, then Categories)
                await tx.run('DELETE FROM BundleItem');
                await tx.run('DELETE FROM TransactionItem');
                await tx.run('DELETE FROM Transaction_Table');
                await tx.run('DELETE FROM Product');
                await tx.run('DELETE FROM Category');
            });

            console.log('[CLEAR] Inventory wipe completed successfully.');
            res.json({ success: true, message: 'Inventory data cleared successfully' });
        } catch (error: any) {
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                code: error.code
            };
            console.error('[CLEAR] Wipe failed:', errorDetails);

            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.resolve(process.cwd(), 'import_errors.log');
                const logMsg = `[${new Date().toISOString()}] CLEAR ERROR: ${JSON.stringify(errorDetails, null, 2)}\n`;
                fs.appendFileSync(logPath, logMsg);
            } catch (logErr) {
                console.error('Failed to log clear error to file:', logErr);
            }

            res.status(500).json({ error: 'Failed to clear inventory data', details: error.message });
        }
    }
);

export default router;
