const express = require('express');
const router = express.Router();
const axios = require('axios');
const keyService = require('../services/key.service');
const statsService = require('../services/stats.service');

// 转发请求到Gemini API
router.post('/', async (req, res) => {
  try {
    // 选择可用密钥
    const key = await keyService.selectAvailableKey();
    if (!key) {
      return res.status(503).json({ message: '没有可用的API密钥' });
    }
    
    // 转发请求
    const response = await axios.post(
      `${process.env.GEMINI_API_BASE_URL}${process.env.GEMINI_API_QUOTA_ENDPOINT}?key=${key.key}`,
      req.body,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 更新统计和密钥使用次数
    await statsService.incrementRequestCount();
    await keyService.incrementKeyUsage(key.id);
    
    // 返回Gemini API的响应
    res.json(response.data);
  } catch (error) {
    console.error('转发请求失败:', error);
    res.status(error.response?.status || 500).json(
      error.response?.data || { message: '转发请求失败' }
    );
  }
});

module.exports = router;
