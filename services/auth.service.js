const jwt = require('jsonwebtoken');

// 生成JWT令牌
exports.generateToken = () => {
  const payload = { user: 'admin' };
  const options = { expiresIn: '24h' };
  
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

// 验证密码
exports.verifyPassword = (password) => {
  return password === process.env.PANEL_PASSWORD;
};
