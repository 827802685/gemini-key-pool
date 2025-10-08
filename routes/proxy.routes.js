const express = require('express');
const router = express.Router();
const proxyController = require('../controllers/proxy.controller');

// 转发请求到Gemini API
router.post('/', proxyController.proxyRequest);

module.exports = router;
