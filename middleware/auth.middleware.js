const authService = require('../services/auth.service');

// 认证中间件
exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }
    
    const token = authHeader.split(' ')[1];
    const { valid, error } = authService.verifyToken(token);
    
    if (!valid) {
        return res.status(401).json({ message: '令牌无效或已过期', error: error?.message });
    }
    
    next();
};
    