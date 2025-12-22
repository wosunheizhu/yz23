/**
 * 通知 Outbox 管理 API（管理员）- Node 8
 * PRD 23.6: GET /admin/notification-outbox
 */

import { apiClient } from './client';

// ================================
// 类型定义
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
  retryCount: number;        // PRD 30.4: 重试次数
  nextRetryAt: string | null; // PRD 30.4: 下次重试时间
  createdAt: string;
  sentAt: string | null;
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
  retryable: number;          // PRD 30.4: 可重试的失败数
  maxRetriesReached: number;  // PRD 30.4: 已达最大重试次数
  byChannel: {
    INBOX: { total: number; pending: number; sent: number; failed: number };
    EMAIL: { total: number; pending: number; sent: number; failed: number };
  };
}

export interface ListOutboxQuery {
  channel?: 'INBOX' | 'EMAIL';
  status?: 'PENDING' | 'SENT' | 'FAILED';
  eventType?: string;
  targetUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ================================
// API 函数
// ================================

/**
 * 获取 Outbox 列表（管理员）
 */
export const listOutbox = async (
  query?: ListOutboxQuery
): Promise<OutboxListResponse> => {
  const response = await apiClient.get('/admin/notification-outbox', { params: query });
  return response.data;
};

/**
 * 获取 Outbox 统计（管理员）
 */
export const getOutboxStats = async (): Promise<OutboxStatsResponse> => {
  const response = await apiClient.get('/admin/notification-outbox/stats');
  return response.data;
};

/**
 * 重试发送失败的通知（管理员）
 */
export const retryOutbox = async (
  outboxId: string
): Promise<{ success: boolean }> => {
  const response = await apiClient.post(`/admin/notification-outbox/${outboxId}/retry`);
  return response.data;
};

/**
 * 批量重试所有失败的邮件（管理员）
 */
export const retryAllFailedEmails = async (): Promise<{ retriedCount: number }> => {
  const response = await apiClient.post('/admin/notification-outbox/retry-all-failed');
  return response.data;
};

/**
 * 手动分发通知（管理员）
 * PRD 23.6: POST /internal/notifications/dispatch
 */
export interface DispatchNotificationInput {
  eventType: string;
  actorUserId?: string;
  targetUserIds: string[];
  relatedObjectType?: string;
  relatedObjectId?: string;
  title: string;
  content: string;
  dedupeKey?: string;
  skipEmail?: boolean;
}

export const dispatchNotification = async (
  input: DispatchNotificationInput
): Promise<{ success: boolean; inboxCount: number; emailCount: number }> => {
  const response = await apiClient.post('/admin/notification-outbox/dispatch', input);
  return response.data;
};

