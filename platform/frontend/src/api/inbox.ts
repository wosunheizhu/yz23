/**
 * 站内信箱 API - Node 8
 * PRD 23.6: 通知（站内 + 邮件）
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type InboxCategory =
  | 'SYSTEM'
  | 'PROJECT'
  | 'DEMAND'
  | 'RESPONSE'
  | 'TOKEN'
  | 'MEETING'
  | 'BOOKING'
  | 'NETWORK'
  | 'COMMUNITY'
  | 'DM';

export interface InboxItemResponse {
  id: string;
  category: InboxCategory;
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
  unreadCount: number;
}

export interface UnreadCountResponse {
  total: number;
  byCategory: Record<InboxCategory, number>;
}

export interface ListInboxQuery {
  category?: InboxCategory;
  unread?: 'true' | 'false';
  page?: number;
  pageSize?: number;
}

export interface NotificationPreferenceResponse {
  emailEnabled: boolean;
  dmEmailMode: 'IMMEDIATE' | 'BATCH_1MIN';
  communityEmailMode: 'IMMEDIATE' | 'BATCH_5MIN';
}

export interface UpdatePreferenceInput {
  emailEnabled?: boolean;
  dmEmailMode?: 'IMMEDIATE' | 'BATCH_1MIN';
  communityEmailMode?: 'IMMEDIATE' | 'BATCH_5MIN';
}

// ================================
// API 函数
// ================================

/**
 * 获取信箱列表
 */
export const listInbox = async (
  query?: ListInboxQuery
): Promise<InboxListResponse> => {
  const response = await apiClient.get('/inbox', { params: query });
  return response.data;
};

/**
 * 获取未读数量
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await apiClient.get('/inbox/unread-count');
  return response.data;
};

/**
 * 获取信箱统计
 */
export const getStats = async (): Promise<{ total: number; unread: number; byCategory: Record<string, { total: number; unread: number }> }> => {
  const response = await apiClient.get('/inbox/stats');
  // 后端可能返回 { success: true, data: {...} } 或直接返回数据
  return response.data?.data || response.data;
};

/**
 * 获取单条消息
 */
export const getInboxItem = async (
  itemId: string
): Promise<InboxItemResponse> => {
  const response = await apiClient.get(`/inbox/${itemId}`);
  return response.data;
};

/**
 * 标记为已读
 */
export const markAsRead = async (
  itemId: string
): Promise<InboxItemResponse> => {
  const response = await apiClient.post(`/inbox/${itemId}/read`);
  return response.data;
};

// 别名
export const markInboxAsRead = markAsRead;

/**
 * 批量标记为已读
 */
export const markMultipleAsRead = async (
  ids: string[]
): Promise<{ count: number }> => {
  const response = await apiClient.post('/inbox/read-batch', { ids });
  return response.data;
};

/**
 * 全部标记为已读
 */
export const markAllAsRead = async (
  category?: InboxCategory
): Promise<{ count: number }> => {
  const response = await apiClient.post('/inbox/read-all', 
    category ? { category } : {}
  );
  return response.data;
};

// 别名
export const markAllInboxAsRead = markAllAsRead;

/**
 * 删除消息
 */
export const deleteInboxItem = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/inbox/${itemId}`);
};

/**
 * 获取通知偏好
 */
export const getPreferences = async (): Promise<NotificationPreferenceResponse> => {
  const response = await apiClient.get('/inbox/preferences');
  return response.data;
};

/**
 * 更新通知偏好
 */
export const updatePreferences = async (
  input: UpdatePreferenceInput
): Promise<NotificationPreferenceResponse> => {
  const response = await apiClient.put('/inbox/preferences', input);
  return response.data;
};

// ================================
// 辅助函数
// ================================

/**
 * 根据信箱消息的关联对象生成跳转 URL
 * PRD 21.5: 站内信箱必须可跳转业务对象
 */
export const getInboxItemNavigationUrl = (
  relatedObjectType: string | null,
  relatedObjectId: string | null
): string | null => {
  if (!relatedObjectType || !relatedObjectId) {
    return null;
  }

  const urlMap: Record<string, string> = {
    PROJECT: `/projects/${relatedObjectId}`,
    DEMAND: `/demands/${relatedObjectId}`,
    RESPONSE: `/responses/${relatedObjectId}`,
    MEETING: `/meetings/${relatedObjectId}`,
    VENUE_BOOKING: `/bookings/${relatedObjectId}`,
    TOKEN_TRANSACTION: `/tokens/transactions/${relatedObjectId}`,
    TOKEN_GRANT_TASK: `/admin/token-grant-tasks/${relatedObjectId}`,
    NETWORK_RESOURCE: `/network-resources/${relatedObjectId}`,
    NETWORK_REFERRAL: `/network-referrals/${relatedObjectId}`,
    USER: `/users/${relatedObjectId}`,
  };

  return urlMap[relatedObjectType] || null;
};

/**
 * 获取信箱分类的显示名称
 */
export const getInboxCategoryLabel = (category: InboxCategory): string => {
  const labels: Record<InboxCategory, string> = {
    SYSTEM: '系统通知',
    PROJECT: '项目动态',
    DEMAND: '需求响应',
    RESPONSE: '响应通知',
    TOKEN: 'Token 交易',
    MEETING: '会议通知',
    BOOKING: '场地预约',
    NETWORK: '人脉资源',
    COMMUNITY: '社群互动',
    DM: '私信消息',
  };
  return labels[category] || '其他';
};

// ================================
// API 对象导出
// ================================

export const inboxApi = {
  listInbox,
  getUnreadCount,
  getStats,
  getInboxStats: getStats,
  getInboxItem,
  markAsRead,
  markInboxAsRead,
  markMultipleAsRead,
  markAllAsRead,
  markAllInboxAsRead,
  deleteInboxItem,
  getPreferences,
  updatePreferences,
  getInboxCategoryLabel,
};

