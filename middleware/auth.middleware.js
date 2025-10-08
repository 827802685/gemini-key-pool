const authService = require('../services/auth.service');

// 认证中间件
exports.authenticate = (req, res, next) => {
  // 检查是否设置了面板密码
  const hasPassword = !!process.env.PANEL_PASSWORD;
  
  // 如果没有设置密码，直接允许访问
  if (!hasPassword) {
    return next();
  }
  
  // 有密码的情况，执行正常认证流程
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  const { valid, error } = authService.verifyToken(token);
  
  if (!valid) {
    return res.status(401).json({ message: '无效的令牌或令牌已过期', error: error?.message });
  }
  
  next();
};
    