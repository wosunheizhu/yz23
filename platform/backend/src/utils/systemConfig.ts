/**
 * 系统配置工具
 * 元征 · 合伙人赋能平台
 * 
 * 管理可配置项（PRD中的"可配置"项）
 * 如：嘉宾奖励默认值、用餐时间缓冲等
 */

import { config } from '../config/index.js';

/**
 * 系统配置项类型
 */
export interface SystemConfig {
  // Token 初始额度
  tokenInitialAmounts: {
    FOUNDER: number;
    CORE_PARTNER: number;
    PARTNER: number;
  };
  
  // 嘉宾邀请奖励默认值 (PRD C, 4.2)
  guestRewardDefaults: {
    PUBLIC_CO_DMHG: number;         // 上市公司董监高
    FIN_EXEC: number;               // 金融从业高管
    PUBLIC_CHAIRMAN_CONTROLLER: number; // 董事长/实控人
    MINISTRY_LEADER: number;        // 部委部级领导
    OTHER: number;                  // 其他
  };
  
  // 用餐时间缓冲（分钟）(PRD 19.5.2)
  mealTimeBufferMinutes: number;
  
  // 验证码有效期（秒）
  verificationCodeTTL: number;
  
  // 验证码频控间隔（秒）
  verificationCodeInterval: number;
  
  // 登录尝试限制
  loginAttemptLimit: {
    maxAttempts: number;
    windowMinutes: number;
  };
  
  // 邮件频控（秒）
  emailThrottling: {
    dmBatchSeconds: number;       // 私聊合并间隔
    communityBatchSeconds: number; // 社群合并间隔
  };
  
  // 是否允许联合创始人创建座谈会 (PRD 3.3)
  allowFounderCreateMeeting: boolean;
  
  // 是否开放自助注册 (PRD A3)
  allowSelfRegistration: boolean;
  
  // 自助注册邀请码
  selfRegistrationInviteCode: string;
  
  // 性能阈值（毫秒）(PRD 4.5)
  performanceThresholds: {
    normalApi: number;
    externalApi: number;
  };
}

/**
 * 默认系统配置
 */
const defaultSystemConfig: SystemConfig = {
  tokenInitialAmounts: {
    FOUNDER: config.token.initialAmounts.FOUNDER,
    CORE_PARTNER: config.token.initialAmounts.CORE_PARTNER,
    PARTNER: config.token.initialAmounts.PARTNER,
  },
  
  guestRewardDefaults: {
    PUBLIC_CO_DMHG: config.guestReward.PUBLIC_CO_DMHG,
    FIN_EXEC: config.guestReward.FIN_EXEC,
    PUBLIC_CHAIRMAN_CONTROLLER: config.guestReward.PUBLIC_CHAIRMAN_CONTROLLER,
    MINISTRY_LEADER: config.guestReward.MINISTRY_LEADER,
    OTHER: config.guestReward.OTHER,
  },
  
  mealTimeBufferMinutes: 30,
  verificationCodeTTL: 600, // 10分钟
  verificationCodeInterval: 60, // 60秒
  
  loginAttemptLimit: {
    maxAttempts: 5,
    windowMinutes: 5,
  },
  
  emailThrottling: {
    dmBatchSeconds: 60,       // 私聊1分钟合并
    communityBatchSeconds: 300, // 社群5分钟合并
  },
  
  allowFounderCreateMeeting: false,
  allowSelfRegistration: false,
  selfRegistrationInviteCode: 'yuanzheng1223',
  
  performanceThresholds: {
    normalApi: 300,
    externalApi: 3000,
  },
};

/**
 * 当前系统配置（可被运行时覆盖）
 */
let currentConfig: SystemConfig = { ...defaultSystemConfig };

/**
 * 获取系统配置
 */
export const getSystemConfig = (): Readonly<SystemConfig> => {
  return currentConfig;
};

/**
 * 获取单个配置项
 */
export const getConfigValue = <K extends keyof SystemConfig>(
  key: K
): SystemConfig[K] => {
  return currentConfig[key];
};

/**
 * 更新系统配置（管理员操作）
 * 生产环境应持久化到数据库
 */
export const updateSystemConfig = (
  updates: Partial<SystemConfig>
): SystemConfig => {
  currentConfig = {
    ...currentConfig,
    ...updates,
  };
  return currentConfig;
};

/**
 * 重置为默认配置
 */
export const resetSystemConfig = (): SystemConfig => {
  currentConfig = { ...defaultSystemConfig };
  return currentConfig;
};

/**
 * 获取嘉宾分类的奖励默认值
 */
export const getGuestRewardAmount = (
  category: keyof SystemConfig['guestRewardDefaults']
): number => {
  return currentConfig.guestRewardDefaults[category];
};

/**
 * 获取角色的 Token 初始额度
 */
export const getTokenInitialAmount = (
  roleLevel: 'FOUNDER' | 'CORE_PARTNER' | 'PARTNER'
): number => {
  return currentConfig.tokenInitialAmounts[roleLevel];
};






