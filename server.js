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
const authService = require('./services/auth.service');
const keyService = require('./services/key.service');
const statsService = require('./services/stats.service');

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

// 前端页面路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化服务并启动服务器
async function initialize() {
    try {
        await authService.initialize();
        await keyService.initialize();
        await statsService.initialize();
        
        app.listen(PORT, () => {
            console.log(`服务器运行在端口 ${PORT}`);
        });
    } catch (error) {
        console.error('初始化失败:', error);
        process.exit(1);
    }
}

// 启动应用
initialize();
    