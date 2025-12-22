/**
 * 频控工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.2: 验证码接口必须有频控（如60秒）
 * PRD 21.4: 邮件频控（私聊1min合并等）
 */

import { TooManyRequestsError, ErrorCodes } from './errors.js';
import { logger } from './logger.js';

/**
 * 简易内存存储（生产环境应使用 Redis）
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * 频控配置
 */
export interface RateLimitConfig {
  windowMs: number;    // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  keyPrefix?: string;  // 键前缀
}

/**
 * 预设频控配置
 */
export const RATE_LIMIT_PRESETS = {
  // 验证码：60秒1次
  VERIFICATION_CODE: {
    windowMs: 60 * 1000,
    maxRequests: 1,
    keyPrefix: 'verify:',
  },
  
  // 登录尝试：5分钟5次
  LOGIN_ATTEMPT: {
    windowMs: 5 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'login:',
  },
  
  // 密码重置：1小时3次
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'pwdreset:',
  },
  
  // API 通用：1分钟100次
  API_GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api:',
  },
  
  // 邮件发送：1分钟10封
  EMAIL_SEND: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'email:',
  },
} as const;

/**
 * 频控检查结果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * 检查频控
 * @param key 唯一标识（如用户ID、IP、手机号）
 * @param config 频控配置
 * @returns 频控检查结果
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitResult => {
  const fullKey = `${config.keyPrefix || ''}${key}`;
  const now = Date.now();
  
  let record = memoryStore.get(fullKey);
  
  // 如果记录过期，重置
  if (record && record.resetAt <= now) {
    record = undefined;
  }
  
  if (!record) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  const remaining = config.maxRequests - record.count - 1;
  const allowed = remaining >= 0;
  
  if (allowed) {
    record.count++;
    memoryStore.set(fullKey, record);
  }
  
  const result: RateLimitResult = {
    allowed,
    remaining: Math.max(0, remaining),
    resetAt: new Date(record.resetAt),
  };
  
  if (!allowed) {
    result.retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
  }
  
  return result;
};

/**
 * 强制检查频控，超限则抛出异常
 */
export const enforceRateLimit = (
  key: string,
  config: RateLimitConfig
): void => {
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    logger.warn({
      key,
      config,
      retryAfterSeconds: result.retryAfterSeconds,
    }, '频控限制触发');
    
    throw new TooManyRequestsError(ErrorCodes.TOO_MANY_REQUESTS);
  }
};

/**
 * 重置频控计数
 * 用于登录成功后重置失败计数等场景
 */
export const resetRateLimit = (key: string, keyPrefix: string = ''): void => {
  const fullKey = `${keyPrefix}${key}`;
  memoryStore.delete(fullKey);
};

/**
 * 清理过期记录（应定期执行）
 */
export const cleanupExpiredRecords = (): number => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug({ cleaned }, '清理过期频控记录');
  }
  
  return cleaned;
};

// 定期清理（每5分钟）
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

/**
 * 验证码专用频控检查
 */
export const checkVerificationCodeRateLimit = (
  target: string  // 手机号或邮箱
): RateLimitResult => {
  return checkRateLimit(target, RATE_LIMIT_PRESETS.VERIFICATION_CODE);
};

/**
 * 登录尝试频控检查
 */
export const checkLoginRateLimit = (
  identifier: string  // 用户名/邮箱/手机号
): RateLimitResult => {
  return checkRateLimit(identifier, RATE_LIMIT_PRESETS.LOGIN_ATTEMPT);
};






