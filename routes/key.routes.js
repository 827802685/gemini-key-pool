const express = require('express');
const router = express.Router();
const keyController = require('../controllers/key.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 所有密钥相关接口都需要认证
router.use(authMiddleware.authenticate);

// 获取所有密钥
router.get('/', keyController.getAllKeys);

// 添加新密钥
router.post('/', keyController.addKey);

// 测试密钥
router.post('/:id/test', keyController.testKey);

// 删除密钥
router.delete('/:id', keyController.deleteKey);

module.exports = router;
