const express = require('express');
const router = express.Router();
const keyService = require('../services/key.service');
const { authenticate } = require('../middleware/auth.middleware');

// 获取所有密钥
router.get('/', authenticate, async (req, res) => {
    try {
        const keys = await keyService.getAllKeys();
        const stats = await keyService.getStats();
        res.json({ keys, stats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 添加密钥
router.post('/', authenticate, async (req, res) => {
    try {
        const { key, name } = req.body;
        const newKey = await keyService.addKey(key, name);
        res.status(201).json(newKey);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 测试密钥
router.post('/:id/test', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await keyService.testKey(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 删除密钥
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await keyService.deleteKey(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
    