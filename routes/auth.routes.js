const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

// 登录
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ message: '请提供密码' });
  }
  
  // 验证密码
  const isValid = authService.verifyPassword(password);
  
  if (!isValid) {
    return res.status(401).json({ message: '密码错误' });
  }
  
  // 生成令牌
  const token = authService.generateToken();
  
  res.json({
    message: '登录成功',
    token
  });
});

// 验证令牌
router.get('/validate', require('../middleware/auth.middleware').authenticate, (req, res) => {
  res.json({ valid: true, message: '令牌有效' });
});

module.exports = router;
