const express = require('express');
const router = express.Router();
const statsService = require('../services/stats.service');
const authMiddleware = require('../middleware/auth.middleware').authenticate;

// 所有统计接口需要认证
router.use(authMiddleware);

// 获取统计数据
router.get('/', (req, res) => {
  try {
    const stats = statsService.getAllStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

module.exports = router;
