const axios = require('axios');
const keyService = require('./key.service');

// Gemini API配置
let geminiApiBaseUrl;
let geminiApiModel;

// 初始化服务
exports.initialize = () => {
  // 初始化Gemini API配置
  geminiApiBaseUrl = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
  geminiApiModel = process.env.GEMINI_API_MODEL || 'gemini-pro';
  
  console.log('代理服务初始化完成');
};

// 转发请求到Gemini API
exports.forwardRequest = async (requestData) => {
  try {
    // 获取可用密钥
    const availableKey = await keyService.getAvailableKey();
    
    if (!availableKey) {
      return {
        status: 503,
        error: '没有可用的API密钥'
      };
    }
    
    // 构建Gemini API请求URL
    const model = requestData.model || geminiApiModel;
    const url = `${geminiApiBaseUrl}/v1beta/models/${model}:generateContent?key=${availableKey.key}`;
    
    // 转发请求
    const response = await axios.post(url, requestData, {
      timeout: 30000 // 30秒超时
    });
    
    // 更新密钥使用次数
    await keyService.incrementKeyUsage(availableKey.id);
    
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('转发请求失败:', error.response?.data || error.message);
    
    // 处理特定错误
    if (error.response) {
      // 如果是密钥相关错误，标记密钥为无效
      if ([401, 429].includes(error.response.status) && error.config?.url) {
        // 从URL中提取密钥
        const urlParams = new URLSearchParams(error.config.url.split('?')[1]);
        const apiKey = urlParams.get('key');
        
        if (apiKey) {
          // 查找并更新密钥状态
          const keys = await keyService.getAllKeys();
          const keyToUpdate = keys.find(k => k.key === apiKey);
          
          if (keyToUpdate) {
            await keyService.testKey(keyToUpdate.id);
          }
        }
      }
      
      return {
        status: error.response.status,
        error: error.response.data || { message: '请求处理失败' }
      };
    }
    
    return {
      status: 500,
      error: { message: '请求转发失败' }
    };
  }
};
