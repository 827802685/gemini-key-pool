const express = require('express');
const router = express.Router();
const statsService = require('../services/stats.service');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, async (req, res) => {
    try {
        const stats = await statsService.getAllStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
    