const { Cloudflare } = require('cloudflare');
const axios = require('axios');

// 密钥存储键名前缀
const KEY_PREFIX = 'gemini_key_';
const KEY_LIST_KEY = 'gemini_key_list';

// Cloudflare客户端
let cf;
let kvNamespaceId;

// 初始化服务
exports.initialize = async () => {
  try {
    cf = new Cloudflare({
      token: process.env.CF_API_TOKEN
    });
    kvNamespaceId = process.env.CF_KV_NAMESPACE_ID;
    
    console.log('密钥服务初始化完成');
    return true;
  } catch (error) {
    console.error('密钥服务初始化失败:', error);
    throw error;
  }
};

// 获取所有密钥
exports.getAllKeys = async () => {
  try {
    const keyListJson = await cf.kv.namespaces.get(kvNamespaceId, KEY_LIST_KEY);
    if (!keyListJson) return [];
    
    const keyIds = JSON.parse(keyListJson);
    const keys = [];
    
    for (const id of keyIds) {
      const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${id}`);
      if (keyJson) {
        keys.push(JSON.parse(keyJson));
      }
    }
    
    return keys;
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    throw error;
  }
};

// 添加新密钥
exports.addKey = async (apiKey, name = '') => {
  try {
    // 生成唯一ID
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    // 验证密钥有效性
    const isValid = await testKeyValidity(apiKey);
    const status = isValid ? 'ACTIVE' : 'INVALID';
    
    // 构建密钥对象
    const keyData = {
      id,
      key: apiKey,
      name: name || `密钥-${id.slice(-4)}`,
      status,
      totalQuota: '未知',
      remainingQuota: '未知',
      remainingQuotaPercentage: 0,
      todayUsage: 0,
      lastChecked: now,
      createdAt: now
    };
    
    // 如果密钥有效，尝试获取配额
    if (isValid) {
      try {
        const quotaData = await getKeyQuota(apiKey);
        keyData.totalQuota = quotaData.total;
        keyData.remainingQuota = quotaData.remaining;
        keyData.remainingQuotaPercentage = Math.round((quotaData.remaining / quotaData.total) * 100);
      } catch (quotaError) {
        console.warn('获取密钥配额失败:', quotaError);
      }
    }
    
    // 保存密钥
    await cf.kv.namespaces.put(
      kvNamespaceId,
      `${KEY_PREFIX}${id}`,
      JSON.stringify(keyData)
    );
    
    // 更新密钥列表
    await updateKeyList(id);
    
    return keyData;
  } catch (error) {
    console.error('添加密钥失败:', error);
    throw error;
  }
};

// 测试密钥有效性
exports.testKeyValidity = async (apiKey) => {
  try {
    const response = await axios.post(
      `${process.env.GEMINI_API_BASE_URL}${process.env.GEMINI_API_QUOTA_ENDPOINT}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: "测试请求" }] }]
      }
    );
    
    return response.status === 200;
  } catch (error) {
    console.error('测试密钥失败:', error.response?.data || error.message);
    return false;
  }
};

// 获取密钥配额
async function getKeyQuota(apiKey) {
  // 这里简化处理，实际应根据Gemini API的配额接口实现
  return {
    total: 1000,
    remaining: 950
  };
}

// 更新密钥列表
async function updateKeyList(newId) {
  const keyListJson = await cf.kv.namespaces.get(kvNamespaceId, KEY_LIST_KEY);
  const keyIds = keyListJson ? JSON.parse(keyListJson) : [];
  
  keyIds.push(newId);
  await cf.kv.namespaces.put(kvNamespaceId, KEY_LIST_KEY, JSON.stringify(keyIds));
}

// 删除密钥
exports.deleteKey = async (id) => {
  try {
    // 删除密钥数据
    await cf.kv.namespaces.delete(kvNamespaceId, `${KEY_PREFIX}${id}`);
    
    // 更新密钥列表
    const keyListJson = await cf.kv.namespaces.get(kvNamespaceId, KEY_LIST_KEY);
    if (keyListJson) {
      let keyIds = JSON.parse(keyListJson);
      keyIds = keyIds.filter(keyId => keyId !== id);
      await cf.kv.namespaces.put(kvNamespaceId, KEY_LIST_KEY, JSON.stringify(keyIds));
    }
    
    return true;
  } catch (error) {
    console.error('删除密钥失败:', error);
    throw error;
  }
};

// 选择可用密钥
exports.selectAvailableKey = async () => {
  try {
    const keys = await this.getAllKeys();
    // 筛选可用密钥
    const availableKeys = keys.filter(key => key.status === 'ACTIVE');
    
    if (availableKeys.length === 0) {
      throw new Error('没有可用的API密钥');
    }
    
    // 简单随机选择策略
    return availableKeys[Math.floor(Math.random() * availableKeys.length)];
  } catch (error) {
    console.error('选择可用密钥失败:', error);
    throw error;
  }
};

// 更新密钥使用次数
exports.incrementKeyUsage = async (keyId) => {
  try {
    const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
    if (!keyJson) return false;
    
    const keyData = JSON.parse(keyJson);
    keyData.todayUsage = (keyData.todayUsage || 0) + 1;
    
    // 简单判断是否用尽配额
    if (keyData.remainingQuotaPercentage <= 5) {
      keyData.status = 'EXHAUSTED';
    }
    
    await cf.kv.namespaces.put(
      kvNamespaceId,
      `${KEY_PREFIX}${keyId}`,
      JSON.stringify(keyData)
    );
    
    return true;
  } catch (error) {
    console.error('更新密钥使用次数失败:', error);
    return false;
  }
};
