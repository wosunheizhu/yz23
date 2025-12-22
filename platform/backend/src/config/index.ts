/**
 * 应用配置
 * 元征 · 合伙人赋能平台
 */

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // 服务配置
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  
  // 数据库配置
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // 邮件配置
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@yuanzheng.com',
  },
  
  // 前端 URL（用于邮件中的跳转链接）
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  
  // Token初始额度配置 (PRD v2/v3)
  token: {
    initialAmounts: {
      FOUNDER: parseInt(process.env.TOKEN_INITIAL_FOUNDER || '100000', 10),
      CORE_PARTNER: parseInt(process.env.TOKEN_INITIAL_CORE_PARTNER || '30000', 10),
      PARTNER: parseInt(process.env.TOKEN_INITIAL_PARTNER || '10000', 10),
    },
  },
  
  // 座谈会嘉宾邀请奖励默认值 (PRD v3)
  guestReward: {
    PUBLIC_CO_DMHG: parseInt(process.env.REWARD_PUBLIC_CO_DMHG || '500', 10),
    FIN_EXEC: parseInt(process.env.REWARD_FIN_EXEC || '500', 10),
    PUBLIC_CHAIRMAN_CONTROLLER: parseInt(process.env.REWARD_PUBLIC_CHAIRMAN || '1000', 10),
    MINISTRY_LEADER: parseInt(process.env.REWARD_MINISTRY_LEADER || '2000', 10),
    OTHER: parseInt(process.env.REWARD_OTHER || '0', 10),
  },
  
  // 验证码配置 (PRD 8.2)
  verification: {
    codeTTL: parseInt(process.env.VERIFICATION_CODE_TTL || '600', 10), // 10分钟
    codeInterval: parseInt(process.env.VERIFICATION_CODE_INTERVAL || '60', 10), // 60秒
  },
  
  // 登录配置 (PRD 8.2)
  login: {
    maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
    windowMinutes: parseInt(process.env.LOGIN_WINDOW_MINUTES || '5', 10),
  },
  
  // 性能配置 (PRD 4.5)
  performance: {
    normalApiThreshold: parseInt(process.env.PERF_NORMAL_API || '300', 10),
    externalApiThreshold: parseInt(process.env.PERF_EXTERNAL_API || '3000', 10),
  },
  
  // 功能开关 (PRD 可配置项)
  features: {
    allowFounderCreateMeeting: process.env.FEATURE_FOUNDER_CREATE_MEETING === 'true',
    allowSelfRegistration: process.env.FEATURE_SELF_REGISTRATION === 'true',
  },
  
  // 用餐时间缓冲（分钟）(PRD 19.5.2)
  mealTimeBufferMinutes: parseInt(process.env.MEAL_TIME_BUFFER || '30', 10),
  
  // 邮件频控（秒）
  emailThrottling: {
    dmBatchSeconds: parseInt(process.env.EMAIL_DM_BATCH || '60', 10),
    communityBatchSeconds: parseInt(process.env.EMAIL_COMMUNITY_BATCH || '300', 10),
  },
  
  // 备份配置 (PRD 4.5)
  backup: {
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
    directory: process.env.BACKUP_DIRECTORY || '/var/backups/yuanzheng',
  },
  
  // 火山方舟 AI 配置 (PRD 6.6: 新闻资讯 AI)
  ark: {
    apiKey: process.env.ARK_API_KEY || 'ed7fc67b-79f6-43a2-acc4-9ec26b99f091',
    baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    model: process.env.ARK_MODEL || 'doubao-seed-1-6-vision-250815',
  },
  
  // 豆包 TTS 配置（预留）
  doubao: {
    appId: process.env.DOUBAO_APPID || '8459067099',
    accessToken: process.env.DOUBAO_ACCESS_TOKEN || 'fseuUFVMLiARP10OXzh3m01S30aq0r7w',
    secretKey: process.env.DOUBAO_SECRET_KEY || 'JLcWytInL2WxSSob92qhm3ny4BCXFCwy',
  },
  
  // 超级管理员账号（不依赖数据库，用于首次部署）
  superAdmin: {
    enabled: process.env.SUPER_ADMIN_ENABLED === 'true',
    identifier: process.env.SUPER_ADMIN_IDENTIFIER || 'admin@yuanzheng.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    name: process.env.SUPER_ADMIN_NAME || '超级管理员',
  },
} as const;

export type Config = typeof config;

/**
 * 检查必须的环境变量
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL 未配置');
  }
  
  if (config.env === 'production') {
    if (config.jwt.secret === 'default-secret-change-in-production') {
      errors.push('生产环境必须配置 JWT_SECRET');
    }
    
    if (!config.smtp.host) {
      errors.push('生产环境建议配置 SMTP_HOST');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

