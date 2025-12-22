/**
 * 站内信箱 DTO - Node 8
 * PRD 21: 通知中心（站内信箱 + 邮件强制）
 * PRD 23.6: 通知 API
 */

import { z } from 'zod';

// ================================
// 信箱分类枚举
// ================================

export const InboxCategorySchema = z.enum([
  'SYSTEM',      // 系统通知
  'PROJECT',     // 项目相关
  'DEMAND',      // 需求相关
  'RESPONSE',    // 响应相关
  'TOKEN',       // Token 相关
  'MEETING',     // 会议相关
  'BOOKING',     // 预约相关
  'NETWORK',     // 人脉相关
  'COMMUNITY',   // 社群相关
  'DM',          // 私聊相关
]);

export type InboxCategory = z.infer<typeof InboxCategorySchema>;

// ================================
// 列表查询 Schema
// ================================

export const ListInboxQuerySchema = z.object({
  category: InboxCategorySchema.optional(),
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInboxQuery = z.infer<typeof ListInboxQuerySchema>;

// ================================
// 响应类型
// ================================

export interface InboxItemResponse {
  id: string;
  category: InboxCategory;
  title: string;
  content: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface InboxListResponse {
  data: InboxItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface InboxUnreadCountResponse {
  total: number;
  byCategory: Record<InboxCategory, number>;
}

// ================================
// 标记已读 Schema
// ================================

export const MarkReadSchema = z.object({
  ids: z.array(z.string()).optional(), // 批量标记
});

export type MarkReadInput = z.infer<typeof MarkReadSchema>;






