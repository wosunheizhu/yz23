/**
 * 私聊消息服务 - Node 10
 * PRD 18/6.10: 消息模块（私聊）
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { sendNotification } from '../../utils/notification.js';
import type {
  SendMessageInput,
  ListConversationsQuery,
  ListMessagesQuery,
  MessageResponse,
  ConversationResponse,
  ConversationListResponse,
  MessageListResponse,
  UnreadCountResponse,
} from './dm.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 发送私信
// ================================

/**
 * 发送私信
 * PRD 18.2: 私聊
 */
export const sendMessage = async (
  input: SendMessageInput,
  senderId: string
): Promise<MessageResponse> => {
  const { receiverId, content, images } = input;

  // 检查接收者是否存在
  const receiver = await prisma.user.findFirst({
    where: { id: receiverId, isDeleted: false },
    select: { id: true, name: true, avatar: true },
  });

  if (!receiver) {
    throw new Error('接收者不存在');
  }

  // 不能给自己发消息
  if (receiverId === senderId) {
    throw new Error('不能给自己发送私信');
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, name: true, avatar: true },
  });

  const message = await prisma.directMessage.create({
    data: {
      senderId,
      receiverId,
      content,
      images: images || [],
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
  });

  // 发送通知（站内信 + 邮件）
  // PRD 29.5: 私聊必达 - B 站内未读 + 邮件提醒（允许 1min 合并）
  await sendNotification({
    eventType: 'DM_RECEIVED',
    actorId: senderId,
    targetUserIds: [receiverId],
    title: '新私信',
    content: `${sender!.name}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
    relatedObjectType: 'DIRECT_MESSAGE',
    relatedObjectId: message.id,
    channels: ['INBOX', 'EMAIL'], // 站内信 + 邮件（邮件会在 outbox 中合并）
  });

  logger.info({ messageId: message.id, senderId, receiverId }, '私信已发送');

  return formatMessage(message, senderId);
};

// ================================
// 获取会话列表
// ================================

/**
 * 获取会话列表
 * PRD 18.2: 会话列表 + 气泡消息
 */
export const listConversations = async (
  query: ListConversationsQuery,
  userId: string
): Promise<ConversationListResponse> => {
  const { page, pageSize } = query;

  // 获取所有与当前用户相关的消息
  const allMessages = await prisma.directMessage.findMany({
    where: {
      ...notDeleted,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 构建会话映射
  const conversationMap = new Map<string, {
    partner: { id: string; name: string; avatar: string | null };
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
  }>();

  allMessages.forEach((msg) => {
    const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const partner = msg.senderId === userId ? msg.receiver : msg.sender;

    if (!conversationMap.has(partnerId)) {
      conversationMap.set(partnerId, {
        partner: { id: partner.id, name: partner.name, avatar: partner.avatar },
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount: 0,
      });
    }

    // 统计未读消息
    if (msg.receiverId === userId && !msg.isRead) {
      const conv = conversationMap.get(partnerId)!;
      conv.unreadCount++;
    }
  });

  // 转换为数组并排序
  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

  const total = conversations.length;
  const paginated = conversations.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginated.map((conv) => ({
      partnerId: conv.partner.id,
      partnerName: conv.partner.name,
      partnerAvatar: conv.partner.avatar,
      lastMessage: conv.lastMessage.substring(0, 100),
      lastMessageAt: conv.lastMessageAt.toISOString(),
      unreadCount: conv.unreadCount,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取与特定用户的消息历史
// ================================

export const listMessages = async (
  partnerId: string,
  query: ListMessagesQuery,
  userId: string
): Promise<MessageListResponse> => {
  const { before, limit } = query;

  const where: Record<string, unknown> = {
    ...notDeleted,
    OR: [
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ],
  };

  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.directMessage.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // 多取一条判断是否还有更多
  });

  const hasMore = messages.length > limit;
  const data = messages.slice(0, limit).reverse(); // 反转为时间正序

  return {
    data: data.map((msg) => formatMessage(msg, userId)),
    hasMore,
  };
};

// ================================
// 标记消息已读
// ================================

export const markAsRead = async (
  partnerId: string,
  userId: string
): Promise<number> => {
  const result = await prisma.directMessage.updateMany({
    where: {
      senderId: partnerId,
      receiverId: userId,
      isRead: false,
      ...notDeleted,
    },
    data: { isRead: true },
  });

  return result.count;
};

// ================================
// 获取未读消息统计
// ================================

export const getUnreadCount = async (userId: string): Promise<UnreadCountResponse> => {
  const unreadMessages = await prisma.directMessage.findMany({
    where: {
      receiverId: userId,
      isRead: false,
      ...notDeleted,
    },
    select: { senderId: true },
  });

  const byConversation: Record<string, number> = {};
  unreadMessages.forEach((msg) => {
    byConversation[msg.senderId] = (byConversation[msg.senderId] || 0) + 1;
  });

  return {
    total: unreadMessages.length,
    byConversation,
  };
};

// ================================
// 删除消息
// ================================

export const deleteMessage = async (
  messageId: string,
  userId: string
): Promise<void> => {
  const message = await prisma.directMessage.findFirst({
    where: { id: messageId, ...notDeleted },
  });

  if (!message) {
    throw new Error('消息不存在');
  }

  if (message.senderId !== userId) {
    throw new Error('只能删除自己发送的消息');
  }

  await prisma.directMessage.update({
    where: { id: messageId },
    data: { isDeleted: true },
  });

  logger.info({ messageId, userId }, '消息已删除');
};

// ================================
// 辅助函数
// ================================

const formatMessage = (message: any, currentUserId: string): MessageResponse => ({
  id: message.id,
  senderId: message.senderId,
  senderName: message.sender.name,
  senderAvatar: message.sender.avatar,
  receiverId: message.receiverId,
  receiverName: message.receiver.name,
  receiverAvatar: message.receiver.avatar,
  content: message.content,
  images: (message.images as string[]) || [],
  isRead: message.isRead,
  createdAt: message.createdAt.toISOString(),
  isMine: message.senderId === currentUserId,
});

