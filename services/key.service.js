const { Cloudflare } = require('cloudflare');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 密钥存储键名前缀
const KEY_PREFIX = 'gemini_key_';

// Cloudflare客户端
let cf;
let kvNamespaceId;

// Gemini API配置
let geminiApiBaseUrl;

// 初始化服务
exports.initialize = async () => {
  try {
    // 验证必要的环境变量
    if (!process.env.CF_API_TOKEN || !process.env.CF_KV_NAMESPACE_ID) {
      console.error('错误: 未设置Cloudflare环境变量');
      throw new Error('缺少必要的环境变量');
    }
    
    // 初始化Cloudflare客户端
    cf = new Cloudflare({
      token: process.env.CF_API_TOKEN
    });
    kvNamespaceId = process.env.CF_KV_NAMESPACE_ID;
    
    // 初始化Gemini API配置
    geminiApiBaseUrl = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
    
    console.log('密钥服务初始化完成');
  } catch (error) {
    console.error('密钥服务初始化失败:', error);
    throw error;
  }
};

// 检查Cloudflare KV连接
exports.checkConnection = async () => {
  try {
    // 尝试列出存储的密钥（最多1个）
    const response = await cf.kv.namespaces.listKeys(kvNamespaceId, { limit: 1 });
    return true;
  } catch (error) {
    console.error('Cloudflare KV连接检查失败:', error);
    return false;
  }
};

// 获取所有密钥
exports.getAllKeys = async () => {
  try {
    // 列出所有密钥
    const response = await cf.kv.namespaces.listKeys(kvNamespaceId, { prefix: KEY_PREFIX });
    const keys = [];
    
    // 获取每个密钥的详细信息
    for (const key of response.result) {
      const keyDataJson = await cf.kv.namespaces.get(kvNamespaceId, key.name);
      if (keyDataJson) {
        const keyData = JSON.parse(keyDataJson);
        keys.push(keyData);
      }
    }
    
    // 按上次检查时间排序（最新的在前）
    return keys.sort((a, b) => new Date(b.lastChecked) - new Date(a.lastChecked));
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    throw error;
  }
};

// 添加新密钥
exports.addKey = async (apiKey, name = '') => {
  try {
    // 生成唯一ID
    const id = uuidv4();
    const keyName = `${KEY_PREFIX}${id}`;
    
    // 初始密钥数据
    const keyData = {
      id,
      name: name || `密钥-${new Date().toLocaleString()}`,
      key: apiKey,
      status: 'UNKNOWN',
      remainingQuota: 0,
      totalQuota: 0,
      remainingQuotaPercentage: 0,
      todayUsage: 0,
      lastChecked: null,
      createdAt: new Date().toISOString()
    };
    
    // 测试密钥有效性
    const testResult = await testApiKey(apiKey);
    if (testResult.valid) {
      keyData.status = 'ACTIVE';
      keyData.remainingQuota = testResult.remainingQuota;
      keyData.totalQuota = testResult.totalQuota;
      keyData.remainingQuotaPercentage = Math.round((testResult.remainingQuota / testResult.totalQuota) * 100);
    } else {
      keyData.status = 'INVALID';
    }
    
    keyData.lastChecked = new Date().toISOString();
    
    // 保存密钥到KV
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return keyData;
  } catch (error) {
    console.error('添加密钥失败:', error);
    throw error;
  }
};

// 测试密钥
exports.testKey = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    
    // 获取密钥数据
    const keyDataJson = await cf.kv.namespaces.get(kvNamespaceId, keyName);
    if (!keyDataJson) {
      throw new Error('密钥不存在');
    }
    
    const keyData = JSON.parse(keyDataJson);
    
    // 测试密钥有效性
    const testResult = await testApiKey(keyData.key);
    
    // 更新密钥状态
    keyData.lastChecked = new Date().toISOString();
    
    if (testResult.valid) {
      keyData.status = 'ACTIVE';
      keyData.remainingQuota = testResult.remainingQuota;
      keyData.totalQuota = testResult.totalQuota;
      keyData.remainingQuotaPercentage = Math.round((testResult.remainingQuota / testResult.totalQuota) * 100);
    } else {
      keyData.status = testResult.quotaExhausted ? 'EXHAUSTED' : 'INVALID';
    }
    
    // 保存更新后的密钥数据
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return {
      valid: testResult.valid,
      keyData
    };
  } catch (error) {
    console.error('测试密钥失败:', error);
    throw error;
  }
};

// 删除密钥
exports.deleteKey = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    
    // 删除密钥
    await cf.kv.namespaces.delete(kvNamespaceId, keyName);
    return true;
  } catch (error) {
    console.error('删除密钥失败:', error);
    throw error;
  }
};

// 获取可用密钥（用于转发请求）
exports.getAvailableKey = async () => {
  try {
    // 获取所有密钥
    const keys = await this.getAllKeys();
    
    // 筛选出可用的密钥
    const availableKeys = keys.filter(key => key.status === 'ACTIVE' && key.remainingQuota > 0);
    
    if (availableKeys.length === 0) {
      return null;
    }
    
    // 简单策略：随机选择一个可用密钥
    // 可以根据需要修改为更复杂的策略（如选择剩余额度最高的）
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    return availableKeys[randomIndex];
  } catch (error) {
    console.error('获取可用密钥失败:', error);
    throw error;
  }
};

// 更新密钥使用次数
exports.incrementKeyUsage = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    
    // 获取密钥数据
    const keyDataJson = await cf.kv.namespaces.get(kvNamespaceId, keyName);
    if (!keyDataJson) {
      throw new Error('密钥不存在');
    }
    
    const keyData = JSON.parse(keyDataJson);
    
    // 增加今日使用次数
    keyData.todayUsage = (keyData.todayUsage || 0) + 1;
    
    // 减少剩余额度（简单估算）
    if (keyData.remainingQuota > 0) {
      keyData.remainingQuota -= 1;
      keyData.remainingQuotaPercentage = Math.round((keyData.remainingQuota / keyData.totalQuota) * 100);
      
      // 如果额度用尽，标记为已用尽
      if (keyData.remainingQuota <= 0) {
        keyData.status = 'EXHAUSTED';
      }
    }
    
    // 保存更新后的密钥数据
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return keyData;
  } catch (error) {
    console.error('更新密钥使用次数失败:', error);
    // 这里不抛出错误，避免影响主请求流程
    return null;
  }
};

// 测试API密钥有效性
async function testApiKey(apiKey) {
  try {
    // 简单测试：发送一个请求检查是否有效
    const model = process.env.GEMINI_API_MODEL || 'gemini-pro';
    const testUrl = `${geminiApiBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await axios.post(testUrl, {
      contents: [{ parts: [{ text: "测试请求" }] }]
    }, {
      timeout: 5000
    });
    
    // 这里简化处理，实际应用中可能需要更精确的额度计算
    return {
      valid: true,
      quotaExhausted: false,
      remainingQuota: 1000, // 假设值，实际应从API响应中获取
      totalQuota: 1000      // 假设值，实际应从API响应中获取
    };
  } catch (error) {
    console.error('测试API密钥失败:', error.response?.data || error.message);
    
    // 判断错误类型
    const isQuotaExhausted = error.response?.data?.error?.code === 429;
    const isInvalidKey = error.response?.data?.error?.code === 401;
    
    return {
      valid: false,
      quotaExhausted: isQuotaExhausted,
      invalidKey: isInvalidKey,
      error: error.response?.data?.error?.message || error.message
    };
  }
}
