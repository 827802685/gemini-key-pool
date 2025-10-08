const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 健康检查接口（需要认证）
router.get('/', authMiddleware.authenticate, healthController.checkHealth);

module.exports = router;
