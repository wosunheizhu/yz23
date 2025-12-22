/**
 * 站内信箱 Service - Node 8
 * PRD 21: 通知中心（站内信箱）
 * PRD 23.6: 通知 API
 */

import { prisma } from '../../utils/db.js';
import type {
  ListInboxQuery,
  InboxItemResponse,
  InboxListResponse,
  InboxUnreadCountResponse,
  InboxCategory,
} from './inbox.dto.js';

/**
 * 获取用户信箱列表
 * PRD 23.6: GET /inbox
 */
export const listInboxItems = async (
  userId: string,
  query: ListInboxQuery
): Promise<InboxListResponse> => {
  const { category, unread, page, pageSize } = query;

  const where: Record<string, unknown> = {
    userId,
  };

  if (category) {
    where.category = category;
  }

  if (unread === 'true') {
    where.isRead = false;
  } else if (unread === 'false') {
    where.isRead = true;
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inboxItem.count({ where }),
    prisma.inboxItem.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    data: items.map(formatInboxItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    unreadCount,
  };
};

/**
 * 获取未读数量统计
 */
export const getUnreadCount = async (
  userId: string
): Promise<InboxUnreadCountResponse> => {
  const unreadItems = await prisma.inboxItem.groupBy({
    by: ['category'],
    where: { userId, isRead: false },
    _count: true,
  });

  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const item of unreadItems) {
    byCategory[item.category] = item._count;
    total += item._count;
  }

  return {
    total,
    byCategory: byCategory as Record<InboxCategory, number>,
  };
};

/**
 * 获取单条信箱消息
 */
export const getInboxItemById = async (
  itemId: string,
  userId: string
): Promise<InboxItemResponse | null> => {
  const item = await prisma.inboxItem.findFirst({
    where: { id: itemId, userId },
  });

  return item ? formatInboxItem(item) : null;
};

/**
 * 标记为已读
 * PRD 23.6: POST /inbox/{id}/read
 */
export const markAsRead = async (
  itemId: string,
  userId: string
): Promise<InboxItemResponse | null> => {
  const item = await prisma.inboxItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!item) {
    return null;
  }

  if (item.isRead) {
    return formatInboxItem(item);
  }

  const updated = await prisma.inboxItem.update({
    where: { id: itemId },
    data: { isRead: true },
  });

  return formatInboxItem(updated);
};

/**
 * 批量标记为已读
 */
export const markMultipleAsRead = async (
  itemIds: string[],
  userId: string
): Promise<number> => {
  const result = await prisma.inboxItem.updateMany({
    where: {
      id: { in: itemIds },
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return result.count;
};

/**
 * 全部标记为已读
 * PRD 23.6: POST /inbox/read-all
 */
export const markAllAsRead = async (
  userId: string,
  category?: InboxCategory
): Promise<number> => {
  const where: Record<string, unknown> = {
    userId,
    isRead: false,
  };

  if (category) {
    where.category = category;
  }

  const result = await prisma.inboxItem.updateMany({
    where,
    data: { isRead: true },
  });

  return result.count;
};

/**
 * 创建信箱消息（内部使用）
 */
export const createInboxItem = async (data: {
  userId: string;
  category: InboxCategory;
  title: string;
  content: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
}): Promise<InboxItemResponse> => {
  const item = await prisma.inboxItem.create({
    data: {
      userId: data.userId,
      category: data.category,
      title: data.title,
      content: data.content,
      relatedObjectType: data.relatedObjectType,
      relatedObjectId: data.relatedObjectId,
    },
  });

  return formatInboxItem(item);
};

/**
 * 批量创建信箱消息（内部使用）
 */
export const createInboxItems = async (
  items: Array<{
    userId: string;
    category: InboxCategory;
    title: string;
    content: string;
    relatedObjectType?: string;
    relatedObjectId?: string;
  }>
): Promise<number> => {
  const result = await prisma.inboxItem.createMany({
    data: items.map((item) => ({
      userId: item.userId,
      category: item.category,
      title: item.title,
      content: item.content,
      relatedObjectType: item.relatedObjectType,
      relatedObjectId: item.relatedObjectId,
    })),
  });

  return result.count;
};

/**
 * 删除信箱消息（可选功能）
 */
export const deleteInboxItem = async (
  itemId: string,
  userId: string
): Promise<boolean> => {
  const item = await prisma.inboxItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!item) {
    return false;
  }

  await prisma.inboxItem.delete({
    where: { id: itemId },
  });

  return true;
};

// ================================
// 格式化函数
// ================================

function formatInboxItem(item: {
  id: string;
  category: string;
  title: string;
  content: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  isRead: boolean;
  createdAt: Date;
}): InboxItemResponse {
  return {
    id: item.id,
    category: item.category as InboxCategory,
    title: item.title,
    content: item.content,
    relatedObjectType: item.relatedObjectType,
    relatedObjectId: item.relatedObjectId,
    isRead: item.isRead,
    createdAt: item.createdAt,
  };
}






