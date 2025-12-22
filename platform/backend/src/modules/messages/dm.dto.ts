/**
 * 私聊消息 DTO - Node 10
 * PRD 18/6.10: 消息模块（私聊）
 */

import { z } from 'zod';

// ================================
// 发送私信
// ================================

export const SendMessageSchema = z.object({
  receiverId: z.string().cuid(),
  content: z.string().min(1, '消息内容不能为空').max(5000),
  // 附件图片（base64 或 URL）
  images: z.array(z.string()).max(9, '最多上传9张图片').optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

// ================================
// 查询会话列表
// ================================

export const ListConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;

// ================================
// 查询消息历史
// ================================

export const ListMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(), // 游标分页：获取此时间之前的消息
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

// ================================
// 响应类型
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

