const express = require('express');
const router = express.Router();
const keyService = require('../services/key.service');
const statsService = require('../services/stats.service');
const axios = require('axios');

router.post('/', async (req, res) => {
    try {
        // 获取可用密钥
        const { key, id } = await keyService.getAvailableKey();
        if (!key) {
            return res.status(503).json({ message: '没有可用的API密钥' });
        }

        // 转发请求到Gemini API
        const geminiUrl = `${process.env.GEMINI_API_BASE_URL}${req.body.model ? 
            `/v1beta/models/${req.body.model}:generateContent` : 
            process.env.GEMINI_API_QUOTA_ENDPOINT}`;

        const response = await axios.post(geminiUrl, req.body, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
            }
        });

        // 更新密钥使用次数
        await keyService.incrementUsage(id);
        // 更新统计
        await statsService.incrementRequestCount();

        // 返回Gemini响应
        res.json(response.data);
    } catch (error) {
        // 处理密钥无效的情况
        if (error.response && error.response.status === 403) {
            await keyService.markAsInvalid(error.keyId);
            return res.status(403).json({ message: 'API密钥无效或已用尽' });
        }
        
        res.status(500).json({ 
            message: '转发请求失败', 
            error: error.message 
        });
    }
});

module.exports = router;
    