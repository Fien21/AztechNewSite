import { Router, Response } from 'express';
import db from '../lib/db';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET all categories
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const categories = await db.all<any>(`
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
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// POST create category
router.post('/', authenticate, authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Category name is required.' });
            return;
        }
        const { id } = await db.run('INSERT INTO Category (name) VALUES (?)', [name]);
        const category = await db.get<any>('SELECT * FROM Category WHERE id = ?', [id]);
        res.status(201).json(category);
    } catch (error: any) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Category already exists.' });
            return;
        }
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT update category
router.put('/:id', authenticate, authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        await db.run('UPDATE Category SET name = ? WHERE id = ?', [name, Number(req.params.id)]);
        const category = await db.get<any>('SELECT * FROM Category WHERE id = ?', [Number(req.params.id)]);
        res.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category.' });
    }
});

// DELETE category
router.delete('/:id', authenticate, authorize('ADMIN', 'INVENTORY_STAFF', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await db.run('DELETE FROM Category WHERE id = ?', [Number(req.params.id)]);
        res.json({ message: 'Category deleted successfully.' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category.' });
    }
});

export default router;
