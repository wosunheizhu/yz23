/**
 * 频控工具单元测试
 * PRD 8.2: 验证码频控 60 秒
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  checkVerificationCodeRateLimit,
  checkLoginRateLimit,
  RATE_LIMIT_PRESETS,
} from './rateLimit.js';

describe('频控工具', () => {
  const testKey = 'test-user-' + Date.now();

  beforeEach(() => {
    // 重置测试 key 的限制
    resetRateLimit(testKey);
  });

  describe('checkRateLimit', () => {
    it('首次请求应该允许', () => {
      const result = checkRateLimit(testKey, { maxRequests: 5, windowMs: 60000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('超过限制后应该拒绝', () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      
      // 消耗所有配额
      checkRateLimit(testKey, config);
      checkRateLimit(testKey, config);
      checkRateLimit(testKey, config);
      
      // 第4次应该被拒绝
      const result = checkRateLimit(testKey, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('应该返回重置时间', () => {
      const result = checkRateLimit(testKey, { maxRequests: 5, windowMs: 60000 });
      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('checkVerificationCodeRateLimit (PRD 8.2: 60秒)', () => {
    const phoneKey = 'phone:13800138000-' + Date.now();

    it('首次发送应该允许', () => {
      const result = checkVerificationCodeRateLimit(phoneKey);
      expect(result.allowed).toBe(true);
    });

    it('60秒内再次发送应该拒绝', () => {
      checkVerificationCodeRateLimit(phoneKey);
      const result = checkVerificationCodeRateLimit(phoneKey);
      expect(result.allowed).toBe(false);
    });

    it('预设配置应该是60秒1次', () => {
      expect(RATE_LIMIT_PRESETS.VERIFICATION_CODE.maxRequests).toBe(1);
      expect(RATE_LIMIT_PRESETS.VERIFICATION_CODE.windowMs).toBe(60000);
    });
  });

  describe('checkLoginRateLimit (PRD 8.2: 5分钟5次)', () => {
    const loginKey = 'login:user@test.com-' + Date.now();

    it('前5次尝试应该允许', () => {
      for (let i = 0; i < 5; i++) {
        const result = checkLoginRateLimit(loginKey);
        expect(result.allowed).toBe(true);
      }
    });

    it('第6次尝试应该拒绝', () => {
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(loginKey);
      }
      const result = checkLoginRateLimit(loginKey);
      expect(result.allowed).toBe(false);
    });

    it('预设配置应该是5分钟5次', () => {
      expect(RATE_LIMIT_PRESETS.LOGIN_ATTEMPT.maxRequests).toBe(5);
      expect(RATE_LIMIT_PRESETS.LOGIN_ATTEMPT.windowMs).toBe(5 * 60 * 1000);
    });
  });

  describe('resetRateLimit', () => {
    it('重置后应该允许新请求', () => {
      const config = { maxRequests: 1, windowMs: 60000 };
      
      // 消耗配额
      checkRateLimit(testKey, config);
      expect(checkRateLimit(testKey, config).allowed).toBe(false);
      
      // 重置
      resetRateLimit(testKey);
      
      // 应该重新允许
      expect(checkRateLimit(testKey, config).allowed).toBe(true);
    });
  });
});

