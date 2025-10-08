const express = require('express');
const router = express.Router();
const keyService = require('../services/key.service');

router.get('/', async (req, res) => {
    try {
        // 简单检查KV连接
        const kvStatus = await keyService.checkKVConnection();
        
        res.json({
            status: kvStatus ? 'UP' : 'DOWN',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'DOWN',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
    