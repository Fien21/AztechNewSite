import { Router, Response } from 'express';
import db from '../lib/db';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = Router();

// GET global settings
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let settings = await db.get<any>('SELECT * FROM Settings LIMIT 1');
        if (!settings) {
            // Initialize if it doesn't exist
            await db.run(
                `INSERT INTO Settings (
                    isPosOpen, carouselSpeed, carouselTimeout, carouselEnabled, 
                    carouselImages, carouselClockPosition, carouselImageFit
                ) VALUES (1, 5000, 30000, 0, '[]', 'bottom-center', 'contain')`
            );
            settings = await db.get<any>('SELECT * FROM Settings LIMIT 1');
        }
        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});

// PATCH global settings (Admin and Staff)
router.patch('/', authenticate, authorize('ADMIN', 'STAFF'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            isPosOpen, carouselSpeed, carouselTimeout, carouselEnabled,
            carouselImages, carouselClockPosition, carouselImageFit
        } = req.body;

        let settings = await db.get<any>('SELECT * FROM Settings LIMIT 1');
        if (!settings) {
            await db.run(
                `INSERT INTO Settings (
                    isPosOpen, carouselSpeed, carouselTimeout, carouselEnabled, 
                    carouselImages, carouselClockPosition, carouselImageFit
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    isPosOpen !== undefined ? (isPosOpen ? 1 : 0) : 1,
                    carouselSpeed !== undefined ? carouselSpeed : 5000,
                    carouselTimeout !== undefined ? carouselTimeout : 30000,
                    carouselEnabled !== undefined ? (carouselEnabled ? 1 : 0) : 0,
                    carouselImages !== undefined ? carouselImages : '[]',
                    carouselClockPosition !== undefined ? carouselClockPosition : 'bottom-center',
                    carouselImageFit !== undefined ? carouselImageFit : 'contain'
                ]
            );
        } else {
            await db.run(
                `UPDATE Settings SET 
                    isPosOpen = ?, 
                    carouselSpeed = ?, 
                    carouselTimeout = ?, 
                    carouselEnabled = ?, 
                    carouselImages = ?,
                    carouselClockPosition = ?,
                    carouselImageFit = ?
                 WHERE id = ?`,
                [
                    isPosOpen !== undefined ? (isPosOpen ? 1 : 0) : settings.isPosOpen,
                    carouselSpeed !== undefined ? carouselSpeed : settings.carouselSpeed,
                    carouselTimeout !== undefined ? carouselTimeout : settings.carouselTimeout,
                    carouselEnabled !== undefined ? (carouselEnabled ? 1 : 0) : settings.carouselEnabled,
                    carouselImages !== undefined ? carouselImages : settings.carouselImages,
                    carouselClockPosition !== undefined ? carouselClockPosition : settings.carouselClockPosition,
                    carouselImageFit !== undefined ? carouselImageFit : settings.carouselImageFit,
                    settings.id
                ]
            );
        }

        const updated = await db.get<any>('SELECT * FROM Settings LIMIT 1');
        res.json(updated);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
});

// Carousel Image Upload (Admin and Staff)
const CAROUSEL_UPLOAD_DIR = path.join(process.cwd(), 'uploads/carousel');
if (!fs.existsSync(CAROUSEL_UPLOAD_DIR)) {
    fs.mkdirSync(CAROUSEL_UPLOAD_DIR, { recursive: true });
}

const carouselStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, CAROUSEL_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'carousel-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const carouselUpload = multer({
    storage: carouselStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('image');

router.post('/carousel-upload', authenticate, authorize('ADMIN', 'STAFF'), (req: AuthRequest, res: Response) => {
    carouselUpload(req as any, res as any, (err: any) => {
        if (err) {
            console.error('Carousel upload error:', err);
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/carousel/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});

export default router;
