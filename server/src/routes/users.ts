import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../lib/db';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// All user routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// GET all users
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await db.all<any>('SELECT id, name, email, role, createdAt FROM User ORDER BY createdAt DESC');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// POST create user
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required.' });
            return;
        }

        const validRoles = ['ADMIN', 'STAFF', 'CASHIER', 'INVENTORY_STAFF', 'USER'];
        if (role && !validRoles.includes(role)) {
            res.status(400).json({ error: 'Invalid role. Must be ADMIN, STAFF, CASHIER, INVENTORY_STAFF, or USER.' });
            return;
        }

        const existing = await db.get<any>('SELECT id FROM User WHERE email = ?', [email]);
        if (existing) {
            res.status(400).json({ error: 'Email already exists.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { id } = await db.run(
            'INSERT INTO User (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'CASHIER']
        );

        const user = await db.get<any>('SELECT id, name, email, role, createdAt FROM User WHERE id = ?', [id]);

        res.status(201).json(user);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user.' });
    }
});

// PUT update user
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { name, email, password, role } = req.body;

        const fields: string[] = [];
        const params: any[] = [];

        if (name) { fields.push('name = ?'); params.push(name); }
        if (email) { fields.push('email = ?'); params.push(email); }
        if (role) { fields.push('role = ?'); params.push(role); }
        if (password) { fields.push('password = ?'); params.push(await bcrypt.hash(password, 10)); }

        if (fields.length > 0) {
            params.push(id);
            await db.run(`UPDATE User SET ${fields.join(', ')} WHERE id = ?`, params);
        }

        const user = await db.get<any>('SELECT id, name, email, role, createdAt FROM User WHERE id = ?', [id]);

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user.' });
    }
});

// DELETE user
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);

        // Prevent deleting yourself
        if (req.user!.id === id) {
            res.status(400).json({ error: 'You cannot delete your own account.' });
            return;
        }

        await db.run('DELETE FROM User WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

export default router;
