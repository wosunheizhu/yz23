/**
 * 通知分发 DTO - Node 8
 * PRD 21: 通知中心（站内信箱 + 邮件强制）
 */

import { z } from 'zod';

// ================================
// 通知事件类型枚举
// PRD 21.2: 必须发邮件的事件清单
// ================================

export const NotificationEventTypeSchema = z.enum([
  // A. 项目 Project
  'PROJECT_APPROVED',
  'PROJECT_REJECTED',
  'PROJECT_JOIN_APPROVED',
  'PROJECT_JOIN_REJECTED',
  'PROJECT_STATUS_CHANGED',
  'PROJECT_EVENT_ADDED',
  
  // B. 需求 Demand
  'DEMAND_PUBLISHED',
  'DEMAND_NEW_RESPONSE',
  'DEMAND_RESPONSE_APPROVED',
  'DEMAND_RESPONSE_REJECTED',
  'DEMAND_CLOSED',
  'DEMAND_CANCELLED',
  
  // C. 响应 Response
  'RESPONSE_MODIFY_REQUEST',
  'RESPONSE_ABANDON_REQUEST',
  'RESPONSE_MODIFY_ACCEPTED',
  'RESPONSE_MODIFY_REJECTED',
  'RESPONSE_ADMIN_ARBITRATION',
  
  // D. Token
  'TOKEN_TRANSFER_INITIATED',
  'TOKEN_TRANSFER_APPROVED',
  'TOKEN_TRANSFER_REJECTED',
  'TOKEN_TRANSFER_CONFIRMED',
  'TOKEN_TRANSFER_RECEIVER_REJECTED',
  'TOKEN_ADMIN_GRANT',
  'TOKEN_ADMIN_DEDUCT',
  'TOKEN_GRANT_APPROVED',
  'TOKEN_GRANT_REJECTED',
  
  // E. 日历（预约/会议）
  'BOOKING_CREATED',
  'BOOKING_UPDATED',
  'BOOKING_CANCELLED',
  'BOOKING_CONFLICT_FAILED',
  'BOOKING_ADMIN_OVERRIDE',
  'MEETING_INVITED',
  'MEETING_TIME_CHANGED',
  'MEETING_CANCELLED',
  'MEETING_FINISHED',
  
  // F. 社群
  'COMMUNITY_MENTIONED',
  'COMMUNITY_REPLY',
  'COMMUNITY_POST_DELETED',
  
  // G. 私聊
  'DM_NEW_MESSAGE',
  
  // H. 人脉资源
  'NETWORK_RESOURCE_CREATED',
  'NETWORK_REFERRAL_SUBMITTED',
  'NETWORK_REFERRAL_LINKED',
  
  // I. 投票
  'VOTE_CREATED',
  'VOTE_CLOSED',
  'VOTE_DEADLINE_REMINDER',
  
  // J. 私信
  'DM_RECEIVED',
  
  // K. 评论
  'COMMENT_REPLY',
  'COMMENT_REPLIED', // 别名
  
  // L. 公告
  'ANNOUNCEMENT',
  
  // M. 反馈
  'FEEDBACK_SUBMITTED',
  'FEEDBACK_PROCESSED',
]);

export type NotificationEventType = z.infer<typeof NotificationEventTypeSchema>;

// ================================
// 通知分发输入
// ================================

export const DispatchNotificationSchema = z.object({
  eventType: NotificationEventTypeSchema,
  actorUserId: z.string().optional(), // 谁触发
  targetUserIds: z.array(z.string()).min(1), // 谁需要收到
  relatedObjectType: z.string().optional(),
  relatedObjectId: z.string().optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  dedupeKey: z.string().optional(), // 去重键
  skipEmail: z.boolean().optional(), // 是否跳过邮件（特殊情况）
});

// 别名导出，用于路由验证
export const DispatchNotificationInputSchema = DispatchNotificationSchema;
export type DispatchNotificationInput = z.infer<typeof DispatchNotificationSchema>;

// ================================
// 通知 Outbox 查询
// ================================

export const ListOutboxQuerySchema = z.object({
  channel: z.enum(['INBOX', 'EMAIL']).optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  eventType: z.string().optional(),
  targetUserId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListOutboxQuery = z.infer<typeof ListOutboxQuerySchema>;

// ================================
// Outbox 响应类型
// ================================

export interface OutboxItemResponse {
  id: string;
  channel: 'INBOX' | 'EMAIL';
  eventType: string;
  actorUserId: string | null;
  targetUserId: string;
  title: string;
  content: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  retryCount: number;         // PRD 30.4: 重试次数
  nextRetryAt: Date | null;   // PRD 30.4: 下次重试时间
  createdAt: Date;
  sentAt: Date | null;
}

export interface OutboxListResponse {
  data: OutboxItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OutboxStatsResponse {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  retryable: number;      // PRD 30.4: 可重试的失败数
  maxRetriesReached: number; // PRD 30.4: 已达最大重试次数
  byChannel: {
    INBOX: { total: number; pending: number; sent: number; failed: number };
    EMAIL: { total: number; pending: number; sent: number; failed: number };
  };
}

// ================================
// 用户通知偏好
// PRD 21.3: 用户通知偏好
// ================================

export const UpdatePreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  dmEmailMode: z.enum(['IMMEDIATE', 'BATCH_1MIN']).optional(),
  communityEmailMode: z.enum(['IMMEDIATE', 'BATCH_5MIN']).optional(),
});

export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;

export interface NotificationPreferenceResponse {
  emailEnabled: boolean;
  dmEmailMode: 'IMMEDIATE' | 'BATCH_1MIN';
  communityEmailMode: 'IMMEDIATE' | 'BATCH_5MIN';
}

// ================================
// 事件分类映射（用于确定 InboxCategory）
// ================================

export const EVENT_TO_CATEGORY: Record<NotificationEventType, string> = {
  // Project
  PROJECT_APPROVED: 'PROJECT',
  PROJECT_REJECTED: 'PROJECT',
  PROJECT_JOIN_APPROVED: 'PROJECT',
  PROJECT_JOIN_REJECTED: 'PROJECT',
  PROJECT_STATUS_CHANGED: 'PROJECT',
  PROJECT_EVENT_ADDED: 'PROJECT',
  
  // Demand
  DEMAND_PUBLISHED: 'DEMAND',
  DEMAND_NEW_RESPONSE: 'DEMAND',
  DEMAND_RESPONSE_APPROVED: 'RESPONSE',
  DEMAND_RESPONSE_REJECTED: 'RESPONSE',
  DEMAND_CLOSED: 'DEMAND',
  DEMAND_CANCELLED: 'DEMAND',
  
  // Response
  RESPONSE_MODIFY_REQUEST: 'RESPONSE',
  RESPONSE_ABANDON_REQUEST: 'RESPONSE',
  RESPONSE_MODIFY_ACCEPTED: 'RESPONSE',
  RESPONSE_MODIFY_REJECTED: 'RESPONSE',
  RESPONSE_ADMIN_ARBITRATION: 'RESPONSE',
  
  // Token
  TOKEN_TRANSFER_INITIATED: 'TOKEN',
  TOKEN_TRANSFER_APPROVED: 'TOKEN',
  TOKEN_TRANSFER_REJECTED: 'TOKEN',
  TOKEN_TRANSFER_CONFIRMED: 'TOKEN',
  TOKEN_TRANSFER_RECEIVER_REJECTED: 'TOKEN',
  TOKEN_ADMIN_GRANT: 'TOKEN',
  TOKEN_ADMIN_DEDUCT: 'TOKEN',
  TOKEN_GRANT_APPROVED: 'TOKEN',
  TOKEN_GRANT_REJECTED: 'TOKEN',
  
  // Booking/Meeting
  BOOKING_CREATED: 'BOOKING',
  BOOKING_UPDATED: 'BOOKING',
  BOOKING_CANCELLED: 'BOOKING',
  BOOKING_CONFLICT_FAILED: 'BOOKING',
  BOOKING_ADMIN_OVERRIDE: 'BOOKING',
  MEETING_INVITED: 'MEETING',
  MEETING_TIME_CHANGED: 'MEETING',
  MEETING_CANCELLED: 'MEETING',
  MEETING_FINISHED: 'MEETING',
  
  // Community
  COMMUNITY_MENTIONED: 'COMMUNITY',
  COMMUNITY_REPLY: 'COMMUNITY',
  COMMUNITY_POST_DELETED: 'COMMUNITY',
  
  // DM
  DM_NEW_MESSAGE: 'DM',
  
  // Network
  NETWORK_RESOURCE_CREATED: 'NETWORK',
  NETWORK_REFERRAL_SUBMITTED: 'NETWORK',
  NETWORK_REFERRAL_LINKED: 'NETWORK',
  
  // Vote
  VOTE_CREATED: 'COMMUNITY',
  VOTE_CLOSED: 'COMMUNITY',
  VOTE_DEADLINE_REMINDER: 'COMMUNITY',
  
  // DM
  DM_RECEIVED: 'DM',
  
  // Comment
  COMMENT_REPLY: 'COMMUNITY',
  COMMENT_REPLIED: 'COMMUNITY',
  
  // Announcement
  ANNOUNCEMENT: 'SYSTEM',
  
  // Feedback
  FEEDBACK_SUBMITTED: 'SYSTEM',
  FEEDBACK_PROCESSED: 'SYSTEM',
};

// ================================
// 频控配置（毫秒）
// PRD 21.4: 邮件频控
// ================================

export const EMAIL_BATCH_CONFIG: Record<string, number> = {
  DM_NEW_MESSAGE: 60 * 1000, // 私聊：1分钟合并
  COMMUNITY_MENTIONED: 5 * 60 * 1000, // 社群@：5分钟合并
  PROJECT_EVENT_ADDED: 10 * 60 * 1000, // 项目时间线：10分钟合并
};

// 以下事件必须即时发送，不能合并
export const IMMEDIATE_EMAIL_EVENTS: NotificationEventType[] = [
  'PROJECT_APPROVED',
  'PROJECT_REJECTED',
  'TOKEN_TRANSFER_APPROVED',
  'TOKEN_TRANSFER_REJECTED',
  'TOKEN_GRANT_APPROVED',
  'TOKEN_GRANT_REJECTED',
  'TOKEN_ADMIN_GRANT',
  'TOKEN_ADMIN_DEDUCT',
];

