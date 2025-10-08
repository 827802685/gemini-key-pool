const statsService = require('../services/stats.service');

// 获取统计数据
exports.getStats = async (req, res) => {
  try {
    const stats = await statsService.getAllStats();
    res.json(stats);
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
};
