const authService = require('../services/auth.service');

// 登录
exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: '请提供密码' });
    }
    
    const token = await authService.login(password);
    
    if (token) {
      return res.json({ token });
    } else {
      return res.status(401).json({ message: '密码错误' });
    }
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({ message: '登录失败' });
  }
};

// 验证令牌
exports.validateToken = (req, res) => {
  // 如果能到达这里，说明令牌已经通过验证
  res.json({ valid: true });
};
