/**
 * JWT 工具单元测试
 * Gate #1: 权限 - 服务端鉴权
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
} from './jwt.js';

describe('JWT 工具', () => {
  const testPayload = {
    userId: 'test-user-123',
    roleLevel: 'PARTNER',
    isAdmin: false,
  };

  describe('generateToken', () => {
    it('应该生成有效的 JWT token', () => {
      const token = generateToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT 格式: header.payload.signature
    });

    it('应该支持自定义过期时间', () => {
      const token = generateToken(testPayload, '1h');
      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的 token', () => {
      const token = generateToken(testPayload);
      const result = verifyToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.payload?.userId).toBe(testPayload.userId);
      expect(result.payload?.roleLevel).toBe(testPayload.roleLevel);
    });

    it('应该拒绝无效的 token', () => {
      const result = verifyToken('invalid-token');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝篡改的 token', () => {
      const token = generateToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const result = verifyToken(tamperedToken);
      expect(result.valid).toBe(false);
    });
  });

  describe('decodeToken', () => {
    it('应该解码 token 而不验证签名', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('应该返回 null 如果 token 格式无效', () => {
      const decoded = decodeToken('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('应该从 Bearer 头提取 token', () => {
      const token = 'my-jwt-token';
      const header = `Bearer ${token}`;
      
      expect(extractTokenFromHeader(header)).toBe(token);
    });

    it('应该返回 null 如果格式不正确', () => {
      expect(extractTokenFromHeader('Basic abc123')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });
  });
});






