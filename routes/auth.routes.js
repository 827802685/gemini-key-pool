const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');

// 登录
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        const token = await authService.login(password);
        res.json({ token });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

// 验证令牌
router.get('/validate', authenticate, (req, res) => {
    res.json({ valid: true });
});

module.exports = router;
    