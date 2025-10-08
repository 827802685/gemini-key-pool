const keyService = require('../services/key.service');
const statsService = require('../services/stats.service');

// 获取所有密钥
exports.getAllKeys = async (req, res) => {
  try {
    const keys = await keyService.getAllKeys();
    const stats = await statsService.getAllStats();
    
    res.json({
      keys,
      stats: {
        todayRequests: stats.todayRequests
      }
    });
  } catch (error) {
    console.error('获取密钥列表错误:', error);
    res.status(500).json({ message: '获取密钥列表失败' });
  }
};

// 添加新密钥
exports.addKey = async (req, res) => {
  try {
    const { key, name } = req.body;
    
    if (!key) {
      return res.status(400).json({ message: '请提供API密钥' });
    }
    
    const newKey = await keyService.addKey(key, name);
    res.status(201).json(newKey);
  } catch (error) {
    console.error('添加密钥错误:', error);
    res.status(500).json({ message: '添加密钥失败' });
  }
};

// 测试密钥
exports.testKey = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: '请提供密钥ID' });
    }
    
    const result = await keyService.testKey(id);
    
    if (result.valid) {
      res.json({ message: '密钥有效', result });
    } else {
      res.status(400).json({ message: '密钥无效', result });
    }
  } catch (error) {
    console.error('测试密钥错误:', error);
    res.status(500).json({ message: '测试密钥失败' });
  }
};

// 删除密钥
exports.deleteKey = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: '请提供密钥ID' });
    }
    
    await keyService.deleteKey(id);
    res.status(204).send();
  } catch (error) {
    console.error('删除密钥错误:', error);
    res.status(500).json({ message: '删除密钥失败' });
  }
};
