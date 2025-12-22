/**
 * 意见反馈 DTO - Node 9
 * PRD 6.9.2: 意见反馈（Feedback）
 */

import { z } from 'zod';

// ================================
// 反馈类型枚举
// ================================

export const FeedbackTypeSchema = z.enum([
  'SUGGESTION',  // 产品建议
  'BUG',         // Bug 反馈
  'RULE',        // 平台规则
  'COMPLAINT',   // 投诉
  'OTHER',       // 其他
]);

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;

export const FeedbackStatusSchema = z.enum([
  'PENDING',     // 待处理
  'PROCESSED',   // 已处理
]);

export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

// ================================
// 创建反馈
// ================================

export const CreateFeedbackSchema = z.object({
  feedbackType: FeedbackTypeSchema,
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空').max(5000),
  wantContact: z.boolean().default(false),
  contactInfo: z.string().max(200).optional(),
});

export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

// ================================
// 管理员处理反馈
// ================================

export const ProcessFeedbackSchema = z.object({
  response: z.string().min(1, '回复内容不能为空').max(5000),
});

export type ProcessFeedbackInput = z.infer<typeof ProcessFeedbackSchema>;

// ================================
// 查询反馈列表
// ================================

export const ListFeedbacksQuerySchema = z.object({
  status: FeedbackStatusSchema.optional(),
  feedbackType: FeedbackTypeSchema.optional(),
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFeedbacksQuery = z.infer<typeof ListFeedbacksQuerySchema>;

// ================================
// 响应类型
// ================================

export interface FeedbackResponse {
  id: string;
  userId: string;
  userName?: string;
  feedbackType: string;
  title: string;
  content: string;
  wantContact: boolean;
  contactInfo: string | null;
  status: string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  data: FeedbackResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FeedbackStatsResponse {
  total: number;
  pending: number;
  processed: number;
  byType: {
    SUGGESTION: number;
    BUG: number;
    RULE: number;
    COMPLAINT: number;
    OTHER: number;
  };
}

// ================================
// 辅助函数
// ================================

export const getFeedbackTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SUGGESTION: '产品建议',
    BUG: 'Bug 反馈',
    RULE: '平台规则',
    COMPLAINT: '投诉',
    OTHER: '其他',
  };
  return labels[type] || type;
};

