const express = require('express');
const router = express.Router();
const keyService = require('../services/key.service');
const { authenticate } = require('../middleware/auth.middleware');

// 获取所有密钥
router.get('/', authenticate, async (req, res) => {
  try {
    const keys = await keyService.getAllKeys();
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ message: '获取密钥失败', error: error.message });
  }
});

// 添加新密钥
router.post('/', authenticate, async (req, res) => {
  try {
    const { key, name } = req.body;
    
    if (!key) {
      return res.status(400).json({ message: '请提供API密钥' });
    }
    
    const newKey = await keyService.addKey(key, name);
    res.status(201).json(newKey);
  } catch (error) {
    res.status(500).json({ message: '添加密钥失败', error: error.message });
  }
});

// 测试密钥
router.post('/:id/test', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const key = await keyService.testKey(id);
    res.json(key);
  } catch (error) {
    res.status(500).json({ message: '测试密钥失败', error: error.message });
  }
});

// 删除密钥
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await keyService.deleteKey(id);
    res.json({ message: '密钥已删除' });
  } catch (error) {
    res.status(500).json({ message: '删除密钥失败', error: error.message });
  }
});

module.exports = router;
    