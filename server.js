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

// 导入服务初始化
const keyService = require('./services/key.service');
const statsService = require('./services/stats.service');

// 初始化Express
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 路由注册
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);

// 前端页面路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化服务并启动
async function startServer() {
  try {
    await keyService.initialize();
    await statsService.initialize();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
