"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../lib/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET global settings
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        let settings = await db_1.default.get('SELECT * FROM Settings LIMIT 1');
        if (!settings) {
            // Initialize if it doesn't exist
            await db_1.default.run('INSERT INTO Settings (isPosOpen) VALUES (1)');
            settings = await db_1.default.get('SELECT * FROM Settings LIMIT 1');
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
});
// PATCH global settings (Admin only)
router.patch('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { isPosOpen } = req.body;
        let settings = await db_1.default.get('SELECT id, isPosOpen FROM Settings LIMIT 1');
        if (!settings) {
            await db_1.default.run('INSERT INTO Settings (isPosOpen) VALUES (?)', [isPosOpen !== undefined ? (isPosOpen ? 1 : 0) : 1]);
        }
        else {
            await db_1.default.run('UPDATE Settings SET isPosOpen = ? WHERE id = ?', [isPosOpen !== undefined ? (isPosOpen ? 1 : 0) : settings.isPosOpen, settings.id]);
        }
        const updated = await db_1.default.get('SELECT * FROM Settings LIMIT 1');
        res.json(updated);
    }
    catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map