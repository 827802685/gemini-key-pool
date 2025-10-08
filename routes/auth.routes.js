const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

// 登录接口
router.post('/login', async (req, res) => {
  try {
    // 检查是否设置了面板密码
    const hasPassword = !!process.env.PANEL_PASSWORD;
    
    // 如果没有设置密码，直接生成令牌并登录
    if (!hasPassword) {
      const token = authService.generateToken();
      return res.json({ token });
    }
    
    // 有密码的情况，验证密码
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: '请输入密码' });
    }
    
    // 验证密码
    if (password !== process.env.PANEL_PASSWORD) {
      return res.status(401).json({ message: '密码错误，请重试' });
    }
    
    // 生成令牌
    const token = authService.generateToken();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

// 验证令牌接口
router.get('/validate', (req, res) => {
  try {
    // 检查是否设置了面板密码
    const hasPassword = !!process.env.PANEL_PASSWORD;
    
    // 如果没有设置密码，直接返回有效
    if (!hasPassword) {
      return res.json({ valid: true });
    }
    
    // 有密码的情况，验证令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, message: '未提供认证令牌' });
    }
    
    const token = authHeader.split(' ')[1];
    const { valid } = authService.verifyToken(token);
    
    res.json({ valid });
  } catch (error) {
    res.status(500).json({ valid: false, message: '验证失败', error: error.message });
  }
});

module.exports = router;
    