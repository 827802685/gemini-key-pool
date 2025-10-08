const proxyService = require('../services/proxy.service');
const statsService = require('../services/stats.service');

// 转发请求到Gemini API
exports.proxyRequest = async (req, res) => {
  try {
    // 增加请求计数
    await statsService.incrementRequestCount();
    
    // 转发请求
    const { status, data, error } = await proxyService.forwardRequest(req.body);
    
    if (error) {
      return res.status(status || 500).json({ error });
    }
    
    res.status(status).json(data);
  } catch (error) {
    console.error('请求转发错误:', error);
    res.status(500).json({ error: '请求处理失败' });
  }
};
