const authService = require('../services/auth.service');

// 认证中间件
exports.authenticate = (req, res, next) => {
  // 从请求头获取令牌
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 验证令牌
  const { valid, error } = authService.verifyToken(token);
  
  if (!valid) {
    return res.status(401).json({ message: '无效的令牌或令牌已过期', error: error.message });
  }
  
  // 令牌有效，继续处理请求
  next();
};
