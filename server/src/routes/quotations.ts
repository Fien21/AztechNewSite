import { Router, Response } from 'express';
import db from '../lib/db';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// POST create quotation
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { clientName, items, discount, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Quotation must have at least one item.' });
            return;
        }

        let totalAmount = 0;
        const itemsData: any[] = [];

        for (const item of items) {
            // item can be a product or a custom service
            let price = item.price;
            let description = item.description;

            if (item.productId) {
                const product = await db.get<any>('SELECT * FROM Product WHERE id = ?', [item.productId]);
                if (product) {
                    price = item.price || (product.discountPrice !== null ? product.discountPrice : product.price);
                    description = description || product.name;
                }
            }

            const subtotal = price * item.quantity;
            totalAmount += subtotal;
            itemsData.push({
                productId: item.productId || null,
                description,
                quantity: item.quantity,
                price,
                subtotal
            });
        }

        const discountAmount = discount || 0;
        totalAmount = Math.max(0, totalAmount - discountAmount);

        const resultId = await db.transaction(async (tx) => {
            const { id: quotationId } = await tx.run(
                'INSERT INTO Quotation (cashierId, clientName, totalAmount, discount, notes) VALUES (?, ?, ?, ?, ?)',
                [req.user!.id, clientName, totalAmount, discountAmount, notes || '']
            );

            for (const item of itemsData) {
                await tx.run(
                    'INSERT INTO QuotationItem (quotationId, productId, description, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                    [quotationId, item.productId, item.description, item.quantity, item.price, item.subtotal]
                );
            }

            return quotationId;
        });

        const finalQuotation = await db.get<any>('SELECT q.*, u.name as cashierName FROM Quotation q JOIN User u ON q.cashierId = u.id WHERE q.id = ?', [resultId]);
        const finalItems = await db.all<any>('SELECT * FROM QuotationItem WHERE quotationId = ?', [resultId]);

        res.status(201).json({
            ...finalQuotation,
            cashier: { name: finalQuotation.cashierName },
            items: finalItems
        });
    } catch (error) {
        console.error('Create quotation error:', error);
        res.status(500).json({ error: 'Failed to create quotation.' });
    }
});

// GET all quotations
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const quotations = await db.all<any>(`
            SELECT q.*, u.name as cashierName 
            FROM Quotation q 
            JOIN User u ON q.cashierId = u.id 
            ORDER BY q.createdAt DESC
        `);

        for (const q of quotations) {
            q.cashier = { name: q.cashierName };
            const items = await db.all<any>('SELECT * FROM QuotationItem WHERE quotationId = ?', [q.id]);
            q.items = items;
        }

        res.json(quotations);
    } catch (error) {
        console.error('Get quotations error:', error);
        res.status(500).json({ error: 'Failed to fetch quotations.' });
    }
});

// GET single quotation
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const quotation = await db.get<any>(`
            SELECT q.*, u.name as cashierName 
            FROM Quotation q 
            JOIN User u ON q.cashierId = u.id 
            WHERE q.id = ?
        `, [id]);

        if (!quotation) {
            res.status(404).json({ error: 'Quotation not found.' });
            return;
        }

        quotation.cashier = { name: quotation.cashierName };
        const items = await db.all<any>('SELECT * FROM QuotationItem WHERE quotationId = ?', [id]);
        quotation.items = items;

        res.json(quotation);
    } catch (error) {
        console.error('Get quotation error:', error);
        res.status(500).json({ error: 'Failed to fetch quotation.' });
    }
});

export default router;
