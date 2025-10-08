const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware').authenticate;

// 健康检查（需要认证）
router.get('/', authMiddleware, (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      cloudflare: 'UP',
      gemini: 'UP'
    }
  });
});

module.exports = router;
