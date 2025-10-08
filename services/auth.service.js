const jwt = require('jsonwebtoken');

// 从环境变量获取JWT密钥（必须配置）
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('错误: 未配置JWT_SECRET环境变量');
  process.exit(1);
}

// 令牌有效期（24小时）
const TOKEN_EXPIRY = '24h';

// 生成认证令牌
exports.generateToken = () => {
  return jwt.sign({ access: 'gemini_key_pool' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

// 验证令牌
exports.verifyToken = (token) => {
  try {
    jwt.verify(token, JWT_SECRET);
    return { valid: true };
  } catch (error) {
    return { valid: false, error };
  }
};
    