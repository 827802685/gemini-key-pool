const { Cloudflare } = require('cloudflare');

// 统计数据键名
const STATS_KEY = 'gemini_pool_stats';

// Cloudflare客户端和KV命名空间
let cf;
let kvNamespaceId;

// 统计数据
let statsData = {
  totalRequests: 0,
  todayRequests: 0,
  lastReset: new Date().toISOString()
};

// 初始化服务
exports.initialize = async () => {
  try {
    cf = new Cloudflare({
      token: process.env.CF_API_TOKEN
    });
    kvNamespaceId = process.env.CF_KV_NAMESPACE_ID;
    
    // 加载现有统计数据
    await loadStats();
    
    // 检查是否需要重置每日统计（新的一天）
    await checkAndResetDailyStats();
    
    console.log('统计服务初始化完成');
  } catch (error) {
    console.error('统计服务初始化失败:', error);
  }
};

// 加载统计数据
async function loadStats() {
  try {
    const statsJson = await cf.kv.namespaces.get(kvNamespaceId, STATS_KEY);
    if (statsJson) {
      statsData = JSON.parse(statsJson);
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

// 保存统计数据
async function saveStats() {
  try {
    await cf.kv.namespaces.put(kvNamespaceId, STATS_KEY, JSON.stringify(statsData));
  } catch (error) {
    console.error('保存统计数据失败:', error);
  }
}

// 检查并重置每日统计
async function checkAndResetDailyStats() {
  const lastResetDate = new Date(statsData.lastReset);
  const today = new Date();
  
  // 如果不是同一天，重置每日统计
  if (
    lastResetDate.getDate() !== today.getDate() ||
    lastResetDate.getMonth() !== today.getMonth() ||
    lastResetDate.getFullYear() !== today.getFullYear()
  ) {
    statsData.todayRequests = 0;
    statsData.lastReset = today.toISOString();
    await saveStats();
  }
}

// 增加请求计数
exports.incrementRequestCount = async () => {
  statsData.totalRequests += 1;
  statsData.todayRequests += 1;
  
  // 异步保存，不阻塞主流程
  saveStats().catch(err => console.error('保存统计数据失败:', err));
};

// 获取今日请求数
exports.getTodayRequestCount = () => {
  return statsData.todayRequests;
};

// 获取所有统计数据
exports.getAllStats = () => {
  return { ...statsData };
};
    