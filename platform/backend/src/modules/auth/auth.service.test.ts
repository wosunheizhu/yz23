/**
 * 认证服务单元测试
 * Node 1: 身份、角色、可见性
 * 
 * PRD 8.2: 登录与找回密码
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../utils/db.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../utils/audit.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  extractClientInfo: vi.fn().mockReturnValue({}),
}));

import { prisma } from '../../utils/db.js';
import { hashPassword } from '../../utils/password.js';

describe('认证服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('密码登录', () => {
    it('应该拒绝不存在的用户', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      
      const { loginByPassword } = await import('./auth.service.js');
      
      await expect(
        loginByPassword({ identifier: 'nonexistent@test.com', password: 'password' })
      ).rejects.toThrow('账号或密码错误');
    });

    it('应该拒绝错误的密码', async () => {
      const hashedPassword = await hashPassword('correct-password');
      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hashedPassword,
        roleLevel: 'PARTNER',
        isAdmin: false,
      });
      
      const { loginByPassword } = await import('./auth.service.js');
      
      await expect(
        loginByPassword({ identifier: 'test@test.com', password: 'wrong-password' })
      ).rejects.toThrow('账号或密码错误');
    });
  });

  describe('验证码发送', () => {
    it('应该检查用户存在性（重置密码）', async () => {
      (prisma.user.findFirst as any).mockResolvedValue(null);
      
      const { sendVerificationCode } = await import('./auth.service.js');
      
      await expect(
        sendVerificationCode({ target: 'nonexistent@test.com', purpose: 'reset_password' })
      ).rejects.toThrow('该账号不存在');
    });
  });

  describe('获取当前用户', () => {
    it('应该返回用户信息', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        phone: '13800138000',
        name: '测试用户',
        roleLevel: 'PARTNER',
        isAdmin: false,
        passwordHash: 'hashed',
        tokenAccount: { balance: 10000 },
      });
      
      const { getCurrentUser } = await import('./auth.service.js');
      const result = await getCurrentUser('user-1');
      
      expect(result.id).toBe('user-1');
      expect(result.name).toBe('测试用户');
      expect(result.tokenBalance).toBe(10000);
      expect(result.needSetPassword).toBe(false);
    });

    it('应该标记需要设置密码', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: '新用户',
        roleLevel: 'PARTNER',
        isAdmin: false,
        passwordHash: null, // 未设置密码
        tokenAccount: { balance: 10000 },
      });
      
      const { getCurrentUser } = await import('./auth.service.js');
      const result = await getCurrentUser('user-1');
      
      expect(result.needSetPassword).toBe(true);
    });

    it('应该拒绝不存在的用户', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      
      const { getCurrentUser } = await import('./auth.service.js');
      
      await expect(getCurrentUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});






