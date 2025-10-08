const { Cloudflare } = require('cloudflare');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// KV存储键前缀
const KEY_PREFIX = 'gemini_key_';
const KEY_LIST_KEY = 'gemini_keys_list';

// Cloudflare客户端
let cf;
let kvNamespaceId;

// 初始化服务
exports.initialize = async () => {
    try {
        // 从环境变量获取配置
        const accountId = process.env.CF_ACCOUNT_ID;
        const apiToken = process.env.CF_API_TOKEN;
        kvNamespaceId = process.env.CF_KV_NAMESPACE_ID;
        
        if (!accountId || !apiToken || !kvNamespaceId) {
            throw new Error('缺少Cloudflare配置（CF_ACCOUNT_ID、CF_API_TOKEN或CF_KV_NAMESPACE_ID）');
        }
        
        // 初始化Cloudflare客户端
        cf = new Cloudflare({ token: apiToken });
        console.log('密钥服务初始化完成');
    } catch (error) {
        console.error('密钥服务初始化失败:', error);
        throw error;
    }
};

// 检查KV连接
exports.checkKVConnection = async () => {
    try {
        // 尝试获取一个不存在的键，仅用于测试连接
        await cf.kv.namespaces.get(kvNamespaceId, 'test_connection_' + Date.now());
        return true;
    } catch (error) {
        console.error('KV连接检查失败:', error);
        return false;
    }
};

// 获取所有密钥
exports.getAllKeys = async () => {
    try {
        // 从KV获取密钥ID列表
        const keysListJson = await cf.kv.namespaces.get(kvNamespaceId, KEY_LIST_KEY);
        const keysList = keysListJson ? JSON.parse(keysListJson) : [];
        
        // 批量获取密钥详情
        const keys = [];
        for (const keyId of keysList) {
            const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
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
exports.addKey = async (apiKey, name = '未命名') => {
    try {
        // 生成唯一ID
        const keyId = uuidv4();
        const now = new Date().toISOString();
        
        // 测试密钥有效性
        const { valid, quota = 1000, remainingQuota = 1000 } = await testKeyValidity(apiKey);
        
        if (!valid) {
            throw new Error('API密钥无效');
        }
        
        // 构建密钥对象
        const keyData = {
            id: keyId,
            key: apiKey,
            name,
            status: 'ACTIVE',
            totalQuota: quota,
            remainingQuota,
            remainingQuotaPercentage: Math.round((remainingQuota / quota) * 100),
            todayUsage: 0,
            totalUsage: 0,
            createdAt: now,
            lastChecked: now
        };
        
        // 保存密钥到KV
        await cf.kv.namespaces.put(
            kvNamespaceId,
            `${KEY_PREFIX}${keyId}`,
            JSON.stringify(keyData)
        );
        
        // 更新密钥列表
        await updateKeysList(keyId, true);
        
        return keyData;
    } catch (error) {
        console.error('添加密钥失败:', error);
        throw error;
    }
};

// 测试密钥有效性
exports.testKey = async (keyId) => {
    try {
        // 获取密钥
        const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
        if (!keyJson) {
            throw new Error('密钥不存在');
        }
        
        const keyData = JSON.parse(keyJson);
        
        // 测试密钥
        const result = await testKeyValidity(keyData.key);
        const now = new Date().toISOString();
        
        // 更新密钥状态
        keyData.status = result.valid ? 
            (result.remainingQuota > 0 ? 'ACTIVE' : 'EXHAUSTED') : 'INVALID';
        keyData.remainingQuota = result.remainingQuota || 0;
        keyData.totalQuota = result.quota || keyData.totalQuota;
        keyData.remainingQuotaPercentage = keyData.totalQuota > 0 
            ? Math.round((keyData.remainingQuota / keyData.totalQuota) * 100) 
            : 0;
        keyData.lastChecked = now;
        
        // 保存更新
        await cf.kv.namespaces.put(
            kvNamespaceId,
            `${KEY_PREFIX}${keyId}`,
            JSON.stringify(keyData)
        );
        
        return { success: true, status: keyData.status };
    } catch (error) {
        console.error('测试密钥失败:', error);
        throw error;
    }
};

// 删除密钥
exports.deleteKey = async (keyId) => {
    try {
        // 从KV删除密钥
        await cf.kv.namespaces.delete(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
        
        // 从列表中移除
        await updateKeysList(keyId, false);
        
        return true;
    } catch (error) {
        console.error('删除密钥失败:', error);
        throw error;
    }
};

// 获取可用密钥（用于转发）
exports.getAvailableKey = async () => {
    try {
        // 获取所有密钥
        const keys = await this.getAllKeys();
        
        // 筛选可用密钥
        const availableKeys = keys.filter(key => 
            key.status === 'ACTIVE' && key.remainingQuota > 0
        );
        
        if (availableKeys.length === 0) {
            return null;
        }
        
        // 简单负载均衡：随机选择一个
        const randomIndex = Math.floor(Math.random() * availableKeys.length);
        return {
            id: availableKeys[randomIndex].id,
            key: availableKeys[randomIndex].key
        };
    } catch (error) {
        console.error('获取可用密钥失败:', error);
        throw error;
    }
};

// 增加密钥使用次数
exports.incrementUsage = async (keyId) => {
    try {
        const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
        if (!keyJson) {
            throw new Error('密钥不存在');
        }
        
        const keyData = JSON.parse(keyJson);
        
        // 增加使用次数
        keyData.totalUsage += 1;
        keyData.todayUsage += 1;
        keyData.remainingQuota -= 1;
        keyData.remainingQuotaPercentage = keyData.totalQuota > 0 
            ? Math.round((keyData.remainingQuota / keyData.totalQuota) * 100) 
            : 0;
        
        // 如果额度用尽，标记为已用尽
        if (keyData.remainingQuota <= 0) {
            keyData.status = 'EXHAUSTED';
        }
        
        // 保存更新
        await cf.kv.namespaces.put(
            kvNamespaceId,
            `${KEY_PREFIX}${keyId}`,
            JSON.stringify(keyData)
        );
        
        return keyData;
    } catch (error) {
        console.error('更新密钥使用次数失败:', error);
        throw error;
    }
};

// 标记密钥为无效
exports.markAsInvalid = async (keyId) => {
    try {
        const keyJson = await cf.kv.namespaces.get(kvNamespaceId, `${KEY_PREFIX}${keyId}`);
        if (!keyJson) {
            return;
        }
        
        const keyData = JSON.parse(keyJson);
        keyData.status = 'INVALID';
        keyData.lastChecked = new Date().toISOString();
        
        await cf.kv.namespaces.put(
            kvNamespaceId,
            `${KEY_PREFIX}${keyId}`,
            JSON.stringify(keyData)
        );
    } catch (error) {
        console.error('标记密钥为无效失败:', error);
    }
};

// 获取统计信息
exports.getStats = async () => {
    try {
        const keys = await this.getAllKeys();
        return {
            totalKeys: keys.length,
            activeKeys: keys.filter(k => k.status === 'ACTIVE').length,
            invalidKeys: keys.filter(k => k.status === 'INVALID').length,
            exhaustedKeys: keys.filter(k => k.status === 'EXHAUSTED').length,
            totalUsage: keys.reduce((sum, k) => sum + (k.totalUsage || 0), 0),
            todayUsage: keys.reduce((sum, k) => sum + (k.todayUsage || 0), 0)
        };
    } catch (error) {
        console.error('获取密钥统计失败:', error);
        return { totalKeys: 0, activeKeys: 0, todayUsage: 0 };
    }
};

// 内部方法：测试密钥有效性和额度
async function testKeyValidity(apiKey) {
    try {
        const testUrl = `${process.env.GEMINI_API_BASE_URL}${process.env.GEMINI_API_QUOTA_ENDPOINT}`;
        
        const response = await axios.post(testUrl, {
            contents: [{ parts: [{ text: "test" }] }]
        }, {
            headers: { 'x-goog-api-key': apiKey }
        });
        
        // 简单判断：能正常返回则视为有效
        // 实际项目中可根据API返回的额度信息进行更精确的判断
        return {
            valid: true,
            quota: 1000,  // 假设总额度
            remainingQuota: 999  // 假设剩余额度
        };
    } catch (error) {
        console.error('密钥测试失败:', error.response?.data || error.message);
        return { valid: false };
    }
}

// 内部方法：更新密钥ID列表
async function updateKeysList(keyId, add) {
    try {
        let keysList = [];
        const keysListJson = await cf.kv.namespaces.get(kvNamespaceId, KEY_LIST_KEY);
        
        if (keysListJson) {
            keysList = JSON.parse(keysListJson);
        }
        
        // 添加或移除密钥ID
        if (add && !keysList.includes(keyId)) {
            keysList.push(keyId);
        } else if (!add) {
            keysList = keysList.filter(id => id !== keyId);
        }
        
        // 保存更新后的列表
        await cf.kv.namespaces.put(
            kvNamespaceId,
            KEY_LIST_KEY,
            JSON.stringify(keysList)
        );
        
        return keysList;
    } catch (error) {
        console.error('更新密钥列表失败:', error);
        throw error;
    }
}
    