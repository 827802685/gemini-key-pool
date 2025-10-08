const express = require('express');
const router = express.Router();
const statsService = require('../services/stats.service');
const { authenticate } = require('../middleware/auth.middleware');

// 获取统计数据
router.get('/', authenticate, async (req, res) => {
  try {
    const stats = statsService.getAllStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

// 获取今日请求数
router.get('/today-requests', authenticate, async (req, res) => {
  try {
    const count = statsService.getTodayRequestCount();
    res.json({ todayRequests: count });
  } catch (error) {
    res.status(500).json({ message: '获取今日请求数失败', error: error.message });
  }
});

module.exports = router;
    