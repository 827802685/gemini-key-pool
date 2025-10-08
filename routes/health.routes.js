const express = require('express');
const router = express.Router();

// 健康检查接口
router.get('/', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'gemini-key-pool',
    noPasswordMode: !process.env.PANEL_PASSWORD
  });
});

module.exports = router;
    