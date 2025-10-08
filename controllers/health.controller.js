const keyService = require('../services/key.service');

// 检查服务健康状态
exports.checkHealth = async (req, res) => {
  try {
    // 检查Cloudflare KV连接
    const kvHealthy = await keyService.checkConnection();
    
    res.json({
      status: kvHealthy ? 'UP' : 'DOWN',
      components: {
        kvStore: {
          status: kvHealthy ? 'UP' : 'DOWN'
        }
      }
    });
  } catch (error) {
    console.error('健康检查错误:', error);
    res.json({
      status: 'DOWN',
      error: error.message
    });
  }
};
