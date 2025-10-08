const express = require('express');
const router = express.Router();
const axios = require('axios');
const keyService = require('../services/key.service');
const statsService = require('../services/stats.service');

// Gemini API基础URL
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';

// 转发请求到Gemini API
router.post('*', async (req, res) => {
  try {
    // 获取可用密钥
    const availableKey = await keyService.getAvailableKey();
    
    if (!availableKey) {
      return res.status(503).json({ message: '没有可用的API密钥' });
    }
    
    // 构建目标URL
    const targetUrl = `${GEMINI_API_BASE_URL}${req.path}?key=${availableKey.key}`;
    
    // 转发请求
    const response = await axios.post(targetUrl, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    // 更新密钥使用次数和统计
    await keyService.incrementKeyUsage(availableKey.id);
    await statsService.incrementRequestCount();
    
    // 返回响应
    res.json(response.data);
  } catch (error) {
    console.error('转发请求失败:', error);
    
    // 返回上游错误
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: '转发请求失败', error: error.message });
  }
});

module.exports = router;
    