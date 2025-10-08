require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 导入路由
const authRoutes = require('./routes/auth.routes');
const keyRoutes = require('./routes/key.routes');
const proxyRoutes = require('./routes/proxy.routes');
const healthRoutes = require('./routes/health.routes');
const statsRoutes = require('./routes/stats.routes');

// 导入服务并初始化
const statsService = require('./services/stats.service');
const keyService = require('./services/key.service');

// 初始化Express
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);

// 前端页面路由（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化服务并启动
async function startServer() {
  try {
    // 初始化KV存储和统计服务
    await keyService.initialize();
    await statsService.initialize();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`无密码模式: ${!process.env.PANEL_PASSWORD ? '启用' : '禁用'}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
    