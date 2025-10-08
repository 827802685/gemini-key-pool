const jwt = require('jsonwebtoken');

// 初始化服务
exports.initialize = () => {
  // 验证必要的环境变量
  if (!process.env.PANEL_PASSWORD) {
    console.warn('警告: 未设置面板密码，使用默认密码（不推荐用于生产环境）');
  }
  
  if (!process.env.JWT_SECRET) {
    console.error('错误: 未设置JWT_SECRET环境变量');
    throw new Error('缺少必要的环境变量');
  }
  
  console.log('认证服务初始化完成');
};

// 登录验证
exports.login = async (password) => {
  // 从环境变量获取密码，如未设置则使用默认密码（仅用于开发）
  const validPassword = process.env.PANEL_PASSWORD || 'default_password';
  
  // 验证密码
  if (password === validPassword) {
    // 生成JWT令牌
    const token = jwt.sign(
      { authenticated: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    return token;
  }
  
  return null;
};

// 验证令牌
exports.verifyToken = (token) => {
  try {
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error };
  }
};
