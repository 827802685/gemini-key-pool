const { Cloudflare } = require('cloudflare');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// KV存储键名前缀
const KEY_PREFIX = 'gemini_key_';

// Cloudflare客户端
let cf;
let kvNamespaceId;

// Gemini API配置
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
const GEMINI_API_QUOTA_ENDPOINT = process.env.GEMINI_API_QUOTA_ENDPOINT || '/v1beta/models/gemini-pro:generateContent';

// 初始化服务
exports.initialize = async () => {
  try {
    // 检查Cloudflare配置
    if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN || !process.env.CF_KV_NAMESPACE_ID) {
      throw new Error('缺少Cloudflare配置，请检查环境变量');
    }
    
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
    // 列出KV中所有密钥
    const list = await cf.kv.namespaces.listKeys(kvNamespaceId, { prefix: KEY_PREFIX });
    
    // 获取每个密钥的详细信息
    const keys = [];
    for (const key of list.result) {
      const value = await cf.kv.namespaces.get(kvNamespaceId, key.name);
      if (value) {
        keys.push(JSON.parse(value));
      }
    }
    
    return keys;
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    throw error;
  }
};

// 添加新密钥
exports.addKey = async (key, name = '') => {
  try {
    // 生成唯一ID
    const id = uuidv4();
    const keyName = `${KEY_PREFIX}${id}`;
    
    // 初始验证密钥有效性
    const validationResult = await validateKey(key);
    
    // 创建密钥对象
    const keyData = {
      id,
      key,
      name: name || `密钥-${new Date().toLocaleString()}`,
      status: validationResult.valid ? 'ACTIVE' : 'INVALID',
      remainingQuota: validationResult.quota || 0,
      totalQuota: validationResult.totalQuota || 0,
      remainingQuotaPercentage: validationResult.totalQuota 
        ? Math.round((validationResult.quota / validationResult.totalQuota) * 100) 
        : 0,
      todayUsage: 0,
      lastChecked: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // 保存到KV
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return keyData;
  } catch (error) {
    console.error('添加密钥失败:', error);
    throw error;
  }
};

// 删除密钥
exports.deleteKey = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    await cf.kv.namespaces.delete(kvNamespaceId, keyName);
    return true;
  } catch (error) {
    console.error('删除密钥失败:', error);
    throw error;
  }
};

// 测试密钥有效性
exports.testKey = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    const value = await cf.kv.namespaces.get(kvNamespaceId, keyName);
    
    if (!value) {
      throw new Error('密钥不存在');
    }
    
    const keyData = JSON.parse(value);
    const validationResult = await validateKey(keyData.key);
    
    // 更新密钥状态
    keyData.status = validationResult.valid ? 'ACTIVE' : 'INVALID';
    keyData.remainingQuota = validationResult.quota || 0;
    keyData.totalQuota = validationResult.totalQuota || 0;
    keyData.remainingQuotaPercentage = validationResult.totalQuota 
      ? Math.round((validationResult.quota / validationResult.totalQuota) * 100) 
      : 0;
    keyData.lastChecked = new Date().toISOString();
    
    // 保存更新
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return keyData;
  } catch (error) {
    console.error('测试密钥失败:', error);
    throw error;
  }
};

// 获取可用密钥（用于转发请求）
exports.getAvailableKey = async () => {
  try {
    const keys = await this.getAllKeys();
    
    // 筛选可用密钥
    const availableKeys = keys.filter(key => 
      key.status === 'ACTIVE' && key.remainingQuota > 0
    );
    
    if (availableKeys.length === 0) {
      throw new Error('没有可用的API密钥');
    }
    
    // 简单负载均衡：选择今日使用次数最少的密钥
    availableKeys.sort((a, b) => (a.todayUsage || 0) - (b.todayUsage || 0));
    return availableKeys[0];
  } catch (error) {
    console.error('获取可用密钥失败:', error);
    throw error;
  }
};

// 增加密钥使用次数
exports.incrementKeyUsage = async (id) => {
  try {
    const keyName = `${KEY_PREFIX}${id}`;
    const value = await cf.kv.namespaces.get(kvNamespaceId, keyName);
    
    if (!value) {
      throw new Error('密钥不存在');
    }
    
    const keyData = JSON.parse(value);
    keyData.todayUsage = (keyData.todayUsage || 0) + 1;
    
    // 保存更新
    await cf.kv.namespaces.put(kvNamespaceId, keyName, JSON.stringify(keyData));
    
    return keyData;
  } catch (error) {
    console.error('更新密钥使用次数失败:', error);
    // 这里不抛出错误，避免影响主请求流程
    return null;
  }
};

// 验证密钥有效性并获取配额
async function validateKey(apiKey) {
  try {
    // 发送测试请求验证密钥
    const response = await axios.post(
      `${GEMINI_API_BASE_URL}${GEMINI_API_QUOTA_ENDPOINT}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: "test" }] }]
      },
      { timeout: 5000 }
    );
    
    // 简化处理：只要请求成功就认为密钥有效
    // 实际应用中可根据响应提取更详细的配额信息
    return {
      valid: true,
      quota: 1000, // 示例值
      totalQuota: 1000 // 示例值
    };
  } catch (error) {
    console.error('验证密钥失败:', error.response?.data || error.message);
    return {
      valid: false,
      quota: 0,
      totalQuota: 0
    };
  }
}
    