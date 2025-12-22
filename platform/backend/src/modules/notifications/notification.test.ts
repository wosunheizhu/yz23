/**
 * 通知模块单元测试 - Node 8
 * PRD 验收标准测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    inboxItem: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notificationOutbox: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock email transporter
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    smtp: {
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      user: 'test@test.com',
      pass: 'testpass',
      from: 'noreply@test.com',
    },
    frontendUrl: 'http://localhost:5173',
  },
}));

describe('Node 8: 通知中心', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('事件类型定义', () => {
    it('应该包含所有 PRD 21.2 要求的事件类型', async () => {
      const { NotificationEventTypeSchema } = await import('./notification.dto.js');
      
      // PRD 21.2.A: 项目
      expect(NotificationEventTypeSchema.safeParse('PROJECT_APPROVED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('PROJECT_REJECTED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('PROJECT_JOIN_APPROVED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('PROJECT_JOIN_REJECTED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('PROJECT_STATUS_CHANGED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('PROJECT_EVENT_ADDED').success).toBe(true);
      
      // PRD 21.2.D: Token
      expect(NotificationEventTypeSchema.safeParse('TOKEN_TRANSFER_INITIATED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('TOKEN_GRANT_APPROVED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('TOKEN_GRANT_REJECTED').success).toBe(true);
      
      // PRD 21.2.E: 日历
      expect(NotificationEventTypeSchema.safeParse('BOOKING_CREATED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('MEETING_INVITED').success).toBe(true);
      
      // PRD 21.2.F: 社群
      expect(NotificationEventTypeSchema.safeParse('COMMUNITY_MENTIONED').success).toBe(true);
      
      // PRD 21.2.G: 私聊
      expect(NotificationEventTypeSchema.safeParse('DM_NEW_MESSAGE').success).toBe(true);
      
      // PRD 21.2.H: 人脉
      expect(NotificationEventTypeSchema.safeParse('NETWORK_RESOURCE_CREATED').success).toBe(true);
      expect(NotificationEventTypeSchema.safeParse('NETWORK_REFERRAL_SUBMITTED').success).toBe(true);
    });
  });

  describe('频控配置', () => {
    it('应该配置正确的批量合并时间 (PRD 21.4)', async () => {
      const { EMAIL_BATCH_CONFIG } = await import('./notification.dto.js');
      
      // 私聊：1分钟合并
      expect(EMAIL_BATCH_CONFIG.DM_NEW_MESSAGE).toBe(60 * 1000);
      
      // 社群@：5分钟合并
      expect(EMAIL_BATCH_CONFIG.COMMUNITY_MENTIONED).toBe(5 * 60 * 1000);
      
      // 项目时间线：10分钟合并
      expect(EMAIL_BATCH_CONFIG.PROJECT_EVENT_ADDED).toBe(10 * 60 * 1000);
    });

    it('关键事件应该即时发送 (PRD 21.4)', async () => {
      const { IMMEDIATE_EMAIL_EVENTS } = await import('./notification.dto.js');
      
      // 审核/交易结果类必须单封即时
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('PROJECT_APPROVED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('PROJECT_REJECTED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_TRANSFER_APPROVED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_TRANSFER_REJECTED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_GRANT_APPROVED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_GRANT_REJECTED');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_ADMIN_GRANT');
      expect(IMMEDIATE_EMAIL_EVENTS).toContain('TOKEN_ADMIN_DEDUCT');
    });
  });

  describe('事件分类映射', () => {
    it('应该正确映射事件类型到信箱分类', async () => {
      const { EVENT_TO_CATEGORY } = await import('./notification.dto.js');
      
      // 项目类
      expect(EVENT_TO_CATEGORY.PROJECT_APPROVED).toBe('PROJECT');
      expect(EVENT_TO_CATEGORY.PROJECT_REJECTED).toBe('PROJECT');
      
      // Token类
      expect(EVENT_TO_CATEGORY.TOKEN_TRANSFER_INITIATED).toBe('TOKEN');
      expect(EVENT_TO_CATEGORY.TOKEN_GRANT_APPROVED).toBe('TOKEN');
      
      // 预约类
      expect(EVENT_TO_CATEGORY.BOOKING_CREATED).toBe('BOOKING');
      
      // 会议类
      expect(EVENT_TO_CATEGORY.MEETING_INVITED).toBe('MEETING');
      
      // 社群类
      expect(EVENT_TO_CATEGORY.COMMUNITY_MENTIONED).toBe('COMMUNITY');
      
      // 私聊类
      expect(EVENT_TO_CATEGORY.DM_NEW_MESSAGE).toBe('DM');
      
      // 人脉类
      expect(EVENT_TO_CATEGORY.NETWORK_RESOURCE_CREATED).toBe('NETWORK');
    });
  });

  describe('通知偏好 Schema', () => {
    it('应该支持 PRD 21.3 要求的偏好配置', async () => {
      const { UpdatePreferenceSchema } = await import('./notification.dto.js');
      
      // 是否接收邮件
      expect(UpdatePreferenceSchema.safeParse({ emailEnabled: true }).success).toBe(true);
      expect(UpdatePreferenceSchema.safeParse({ emailEnabled: false }).success).toBe(true);
      
      // 私聊邮件策略
      expect(UpdatePreferenceSchema.safeParse({ dmEmailMode: 'IMMEDIATE' }).success).toBe(true);
      expect(UpdatePreferenceSchema.safeParse({ dmEmailMode: 'BATCH_1MIN' }).success).toBe(true);
      
      // 社群邮件策略
      expect(UpdatePreferenceSchema.safeParse({ communityEmailMode: 'IMMEDIATE' }).success).toBe(true);
      expect(UpdatePreferenceSchema.safeParse({ communityEmailMode: 'BATCH_5MIN' }).success).toBe(true);
    });
  });

  describe('Outbox 查询 Schema', () => {
    it('应该支持 PRD 22.4 要求的筛选条件', async () => {
      const { ListOutboxQuerySchema } = await import('./notification.dto.js');
      
      // 渠道
      expect(ListOutboxQuerySchema.safeParse({ channel: 'INBOX' }).success).toBe(true);
      expect(ListOutboxQuerySchema.safeParse({ channel: 'EMAIL' }).success).toBe(true);
      
      // 状态
      expect(ListOutboxQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(true);
      expect(ListOutboxQuerySchema.safeParse({ status: 'SENT' }).success).toBe(true);
      expect(ListOutboxQuerySchema.safeParse({ status: 'FAILED' }).success).toBe(true);
      
      // 事件类型
      expect(ListOutboxQuerySchema.safeParse({ eventType: 'PROJECT_APPROVED' }).success).toBe(true);
      
      // 时间范围
      expect(ListOutboxQuerySchema.safeParse({ 
        from: '2025-01-01T00:00:00Z',
        to: '2025-12-31T23:59:59Z',
      }).success).toBe(true);
    });
  });

  describe('去重键生成', () => {
    it('应该生成唯一的去重键 (PRD 21.5)', async () => {
      const { generateDedupeKey } = await import('../../utils/notification.js');
      
      const key1 = generateDedupeKey('PROJECT_APPROVED', 'user1', 'project1');
      const key2 = generateDedupeKey('PROJECT_APPROVED', 'user1', 'project2');
      const key3 = generateDedupeKey('PROJECT_APPROVED', 'user2', 'project1');
      
      expect(key1).toBe('PROJECT_APPROVED:user1:project1');
      expect(key2).toBe('PROJECT_APPROVED:user1:project2');
      expect(key3).toBe('PROJECT_APPROVED:user2:project1');
      
      // 不同的键应该不相等
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('通知标题模板', () => {
    it('应该为所有事件类型返回正确的标题', async () => {
      const { getNotificationTitle } = await import('../../utils/notification.js');
      
      expect(getNotificationTitle('PROJECT_APPROVED')).toBe('项目审核通过');
      expect(getNotificationTitle('PROJECT_REJECTED')).toBe('项目审核未通过');
      expect(getNotificationTitle('TOKEN_GRANT_APPROVED')).toBe('座谈会奖励已发放');
      expect(getNotificationTitle('MEETING_INVITED')).toBe('您被邀请参加会议');
      expect(getNotificationTitle('COMMUNITY_MENTIONED')).toBe('有人 @ 了您');
      expect(getNotificationTitle('DM_NEW_MESSAGE')).toBe('您有新私信');
      expect(getNotificationTitle('NETWORK_RESOURCE_CREATED')).toBe('人脉资源创建成功');
    });
  });
});






