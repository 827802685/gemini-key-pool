const jwt = require('jsonwebtoken');

// 从环境变量获取密码和JWT密钥
const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// 初始化服务
exports.initialize = () => {
    if (!PANEL_PASSWORD || !JWT_SECRET) {
        throw new Error('缺少必要的认证配置（PANEL_PASSWORD或JWT_SECRET）');
    }
    console.log('认证服务初始化完成');
};

// 登录验证
exports.login = (password) => {
    if (password !== PANEL_PASSWORD) {
        throw new Error('密码错误');
    }
    
    // 生成JWT令牌（有效期24小时）
    return jwt.sign(
        { timestamp: new Date().getTime() },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
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
    