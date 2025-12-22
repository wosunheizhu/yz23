/**
 * 消息 API - Node 10
 * PRD 18/6.10: 消息模块（私聊 + 信箱）
 */

import { apiClient } from './client';

// ================================
// 私聊类型定义
// ================================

export interface MessageResponse {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  content: string;
  images: string[];
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
}

export interface ConversationResponse {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationListResponse {
  data: ConversationResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MessageListResponse {
  data: MessageResponse[];
  hasMore: boolean;
}

export interface UnreadCountResponse {
  total: number;
  byConversation: Record<string, number>;
}

export interface SendMessageInput {
  receiverId: string;
  content: string;
  images?: string[];
}

export interface ListConversationsQuery {
  page?: number;
  pageSize?: number;
}

export interface ListMessagesQuery {
  before?: string;
  limit?: number;
}

// ================================
// 信箱类型定义
// ================================

export type InboxCategory = 'ANNOUNCEMENT' | 'SYSTEM' | 'VOTE' | 'DM' | 'MENTION';

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
}

export interface InboxStatsResponse {
  total: number;
  unread: number;
  byCategory: Record<string, { total: number; unread: number }>;
}

export interface ListInboxQuery {
  category?: InboxCategory;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

// ================================
// 私聊 API 方法
// ================================

export const dmApi = {
  // 获取会话列表
  listConversations: (query?: ListConversationsQuery) =>
    apiClient.get<ConversationListResponse>('/dm/conversations', { params: query }),

  // 获取未读消息统计
  getUnreadCount: () =>
    apiClient.get<UnreadCountResponse>('/dm/unread'),

  // 获取与特定用户的消息历史
  listMessages: (partnerId: string, query?: ListMessagesQuery) =>
    apiClient.get<MessageListResponse>(`/dm/${partnerId}`, { params: query }),

  // 发送私信
  send: (data: SendMessageInput) =>
    apiClient.post<MessageResponse>('/dm', data),

  // 标记与特定用户的消息为已读
  markAsRead: (partnerId: string) =>
    apiClient.post<{ success: boolean; markedCount: number }>(`/dm/${partnerId}/read`),

  // 删除消息
  delete: (messageId: string) =>
    apiClient.delete<void>(`/dm/${messageId}`),
};

// ================================
// 信箱 API 方法
// ================================

export const inboxApi = {
  // 获取信箱列表
  list: (query?: ListInboxQuery) =>
    apiClient.get<InboxListResponse>('/inbox', { params: query }),

  // 获取信箱统计
  getStats: () =>
    apiClient.get<InboxStatsResponse>('/inbox/stats'),

  // 获取单个信箱项
  getById: (id: string) =>
    apiClient.get<InboxItemResponse>(`/inbox/${id}`),

  // 标记单个信箱项已读
  markAsRead: (id: string) =>
    apiClient.post<{ success: boolean }>(`/inbox/${id}/read`),

  // 标记全部已读（可选分类）
  markAllAsRead: (category?: InboxCategory) =>
    apiClient.post<{ success: boolean; markedCount: number }>('/inbox/read-all', { category }),

  // 删除单个信箱项
  delete: (id: string) =>
    apiClient.delete<void>(`/inbox/${id}`),

  // 清空所有已读消息
  clearRead: () =>
    apiClient.delete<{ success: boolean; deletedCount: number }>('/inbox/clear-read'),
};

// ================================
// 统一别名（兼容旧代码）
// ================================

export const messagesApi = dmApi;

