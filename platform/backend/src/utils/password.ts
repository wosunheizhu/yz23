/**
 * 密码工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD 1665: 密码加密存储
 */

import bcrypt from 'bcryptjs';

/**
 * 加密轮数
 */
const SALT_ROUNDS = 10;

/**
 * 密码最小长度
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * 密码最大长度
 */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * 哈希密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * 验证密码
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * 验证密码强度
 * @returns 错误消息数组，空数组表示通过
 */
export const validatePasswordStrength = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`密码长度至少 ${MIN_PASSWORD_LENGTH} 位`);
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`密码长度不能超过 ${MAX_PASSWORD_LENGTH} 位`);
  }
  
  // 可选：更严格的密码规则
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('密码需包含至少一个大写字母');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('密码需包含至少一个小写字母');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('密码需包含至少一个数字');
  // }
  
  return errors;
};

/**
 * 生成随机密码
 */
export const generateRandomPassword = (length: number = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};






