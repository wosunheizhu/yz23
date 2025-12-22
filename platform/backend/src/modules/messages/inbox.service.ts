/**
 * 站内信箱服务 - Node 10
 * PRD 18.1: 站内信箱
 */

import { prisma } from '../../utils/db.js';
import type {
  ListInboxQuery,
  InboxItemResponse,
  InboxListResponse,
  InboxStatsResponse,
  InboxCategory,
} from './inbox.dto.js';

// ================================
// 获取信箱列表
// ================================

/**
 * 获取用户信箱列表
 * PRD 18.1: 站内信箱（分类 Tab）
 */
export const listInbox = async (
  query: ListInboxQuery,
  userId: string
): Promise<InboxListResponse> => {
  const { category, isRead, page, pageSize } = query;

  const where: Record<string, unknown> = { userId };

  if (category) where.category = category;
  if (isRead !== undefined) where.isRead = isRead;

  const [items, total] = await Promise.all([
    prisma.inboxItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inboxItem.count({ where }),
  ]);

  return {
    data: items.map(formatInboxItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取单个信箱项
// ================================

export const getInboxItemById = async (
  id: string,
  userId: string
): Promise<InboxItemResponse | null> => {
  const item = await prisma.inboxItem.findFirst({
    where: { id, userId },
  });

  return item ? formatInboxItem(item) : null;
};

// ================================
// 标记已读
// ================================

export const markAsRead = async (id: string, userId: string): Promise<void> => {
  await prisma.inboxItem.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (
  userId: string,
  category?: InboxCategory
): Promise<number> => {
  const where: Record<string, unknown> = { userId, isRead: false };
  if (category) where.category = category;

  const result = await prisma.inboxItem.updateMany({
    where,
    data: { isRead: true },
  });

  return result.count;
};

// ================================
// 删除信箱项
// ================================

export const deleteInboxItem = async (id: string, userId: string): Promise<void> => {
  await prisma.inboxItem.deleteMany({
    where: { id, userId },
  });
};

export const deleteAllRead = async (userId: string): Promise<number> => {
  const result = await prisma.inboxItem.deleteMany({
    where: { userId, isRead: true },
  });

  return result.count;
};

// ================================
// 获取信箱统计
// ================================

export const getInboxStats = async (userId: string): Promise<InboxStatsResponse> => {
  const items = await prisma.inboxItem.findMany({
    where: { userId },
    select: { category: true, isRead: true },
  });

  const total = items.length;
  const unread = items.filter((i) => !i.isRead).length;

  const byCategory: Record<string, { total: number; unread: number }> = {
    ANNOUNCEMENT: { total: 0, unread: 0 },
    SYSTEM: { total: 0, unread: 0 },
    VOTE: { total: 0, unread: 0 },
    DM: { total: 0, unread: 0 },
    MENTION: { total: 0, unread: 0 },
  };

  items.forEach((item) => {
    if (byCategory[item.category]) {
      byCategory[item.category].total++;
      if (!item.isRead) {
        byCategory[item.category].unread++;
      }
    }
  });

  return {
    total,
    unread,
    byCategory,
  };
};

// ================================
// 创建信箱项（内部调用）
// ================================

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
      category: data.category as any,
      title: data.title,
      content: data.content,
      relatedObjectType: data.relatedObjectType,
      relatedObjectId: data.relatedObjectId,
    },
  });

  return formatInboxItem(item);
};

// ================================
// 辅助函数
// ================================

const formatInboxItem = (item: any): InboxItemResponse => ({
  id: item.id,
  category: item.category,
  title: item.title,
  content: item.content,
  relatedObjectType: item.relatedObjectType,
  relatedObjectId: item.relatedObjectId,
  isRead: item.isRead,
  createdAt: item.createdAt.toISOString(),
});

