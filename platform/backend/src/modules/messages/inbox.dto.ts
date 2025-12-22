/**
 * 站内信箱 DTO - Node 10
 * PRD 18.1: 站内信箱
 */

import { z } from 'zod';

// ================================
// 信箱分类
// ================================

export const InboxCategorySchema = z.enum([
  'ANNOUNCEMENT',   // 公告
  'SYSTEM',         // 系统通知
  'VOTE',           // 投票
  'DM',             // 私信
  'MENTION',        // @ 提醒
]);

export type InboxCategory = z.infer<typeof InboxCategorySchema>;

// ================================
// 查询信箱列表
// ================================

export const ListInboxQuerySchema = z.object({
  category: InboxCategorySchema.optional(),
  isRead: z.preprocess(
    (val) => val === 'true' ? true : val === 'false' ? false : undefined,
    z.boolean().optional()
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListInboxQuery = z.infer<typeof ListInboxQuerySchema>;

// ================================
// 响应类型
// ================================

export interface InboxItemResponse {
  id: string;
  category: string;
  title: string;
  content: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface InboxListResponse {
  data: InboxItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface InboxStatsResponse {
  total: number;
  unread: number;
  byCategory: Record<string, { total: number; unread: number }>;
}






