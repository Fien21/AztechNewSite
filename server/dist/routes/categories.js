"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all categories
router.get('/', auth_1.authenticate, async (_req, res) => {
    try {
        const categories = await db_1.default.all(`
            SELECT c.*, (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) as _count_products
            FROM Category c
            ORDER BY c.name ASC
        `);
        // Format to match Prisma output if needed
        const formatted = categories.map(c => ({
            ...c,
            _count: { products: c._count_products }
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});
// POST create category
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Category name is required.' });
            return;
        }
        const { id } = await db_1.default.run('INSERT INTO Category (name) VALUES (?)', [name]);
        const category = await db_1.default.get('SELECT * FROM Category WHERE id = ?', [id]);
        res.status(201).json(category);
    }
    catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Category already exists.' });
            return;
        }
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category.' });
    }
});
// PUT update category
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        const { name } = req.body;
        await db_1.default.run('UPDATE Category SET name = ? WHERE id = ?', [name, Number(req.params.id)]);
        const category = await db_1.default.get('SELECT * FROM Category WHERE id = ?', [Number(req.params.id)]);
        res.json(category);
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category.' });
    }
});
// DELETE category
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req, res) => {
    try {
        await db_1.default.run('DELETE FROM Category WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: 'Category deleted successfully.' });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map