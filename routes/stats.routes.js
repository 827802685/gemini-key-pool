const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 所有统计相关接口都需要认证
router.use(authMiddleware.authenticate);

// 获取统计数据
router.get('/', statsController.getStats);

module.exports = router;
