/**
 * 密码工具单元测试
 * PRD 4.5: 密码加密存储
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateRandomPassword,
  MIN_PASSWORD_LENGTH,
} from './password.js';

describe('密码工具', () => {
  describe('hashPassword', () => {
    it('应该生成 bcrypt 哈希', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt 前缀
    });

    it('相同密码应该生成不同的哈希（盐值不同）', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('正确密码应该验证通过', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('错误密码应该验证失败', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('强密码应该通过验证', () => {
      const errors = validatePasswordStrength('StrongPass123!');
      expect(errors).toHaveLength(0);
    });

    it('太短的密码应该失败', () => {
      const errors = validatePasswordStrength('Ab1!');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('长度'))).toBe(true);
    });

    it('没有大写字母应该失败', () => {
      const errors = validatePasswordStrength('weakpassword123!');
      expect(errors.some(e => e.includes('大写'))).toBe(true);
    });

    it('没有数字应该失败', () => {
      const errors = validatePasswordStrength('WeakPassword!');
      expect(errors.some(e => e.includes('数字'))).toBe(true);
    });

    it('没有特殊字符应该失败', () => {
      const errors = validatePasswordStrength('WeakPassword123');
      expect(errors.some(e => e.includes('特殊'))).toBe(true);
    });
  });

  describe('generateRandomPassword', () => {
    it('应该生成指定长度的密码', () => {
      const password = generateRandomPassword(16);
      expect(password.length).toBe(16);
    });

    it('生成的密码应该满足强度要求', () => {
      const password = generateRandomPassword(12);
      const errors = validatePasswordStrength(password);
      expect(errors).toHaveLength(0);
    });

    it('默认长度应该满足最小要求', () => {
      const password = generateRandomPassword();
      expect(password.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    });
  });
});






