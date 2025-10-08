const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 登录
router.post('/login', authController.login);

// 验证令牌
router.get('/validate', authMiddleware.authenticate, authController.validateToken);

module.exports = router;
