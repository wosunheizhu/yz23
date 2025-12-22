/**
 * 通知分发 Service - Node 8
 * PRD 21: 通知中心（站内信箱 + 邮件强制）
 * PRD 21.1: 事件驱动分发
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createInboxItems } from './inbox.service.js';
import { sendEmail } from './email.service.js';
import {
  EVENT_TO_CATEGORY,
  EMAIL_BATCH_CONFIG,
  IMMEDIATE_EMAIL_EVENTS,
  type NotificationEventType,
  type DispatchNotificationInput,
  type ListOutboxQuery,
  type OutboxListResponse,
  type OutboxStatsResponse,
  type UpdatePreferenceInput,
  type NotificationPreferenceResponse,
} from './notification.dto.js';
import type { InboxCategory } from './inbox.dto.js';

// ================================
// 频控缓存（内存）
// ================================

interface BatchedNotification {
  userId: string;
  eventType: NotificationEventType;
  items: Array<{ title: string; content: string; relatedObjectType?: string; relatedObjectId?: string }>;
  scheduledAt: number;
}

const batchQueue = new Map<string, BatchedNotification>();

// ================================
// 通知分发（核心）
// ================================

/**
 * 分发通知
 * PRD 21.1: 事件驱动分发到 InboxItem + Email
 */
export const dispatchNotification = async (
  input: DispatchNotificationInput
): Promise<{ inboxCount: number; emailCount: number }> => {
  const { eventType, actorUserId, targetUserIds, relatedObjectType, relatedObjectId, title, content, dedupeKey, skipEmail } = input;

  const category = EVENT_TO_CATEGORY[eventType] as InboxCategory;
  
  // 1. 创建站内信箱消息（必达）
  const inboxItems = targetUserIds.map((userId) => ({
    userId,
    category,
    title,
    content,
    relatedObjectType,
    relatedObjectId,
  }));

  const inboxCount = await createInboxItems(inboxItems);

  // 记录 Outbox（站内）
  await prisma.notificationOutbox.createMany({
    data: targetUserIds.map((userId) => ({
      channel: 'INBOX' as const,
      eventType,
      actorUserId,
      targetUserId: userId,
      title,
      content,
      relatedObjectType,
      relatedObjectId,
      status: 'SENT' as const,
      sentAt: new Date(),
      dedupeKey: dedupeKey ? `${dedupeKey}_${userId}_INBOX` : undefined,
    })),
  });

  // 2. 发送邮件（除非明确跳过）
  let emailCount = 0;
  if (!skipEmail) {
    emailCount = await dispatchEmails(
      eventType,
      actorUserId,
      targetUserIds,
      title,
      content,
      relatedObjectType,
      relatedObjectId,
      dedupeKey
    );
  }

  logger.info({ eventType, targetUserIds: targetUserIds.length, inboxCount, emailCount }, 'Notification dispatched');

  return { inboxCount, emailCount };
};

/**
 * 分发邮件（带频控）
 * PRD 21.4: 邮件频控
 */
const dispatchEmails = async (
  eventType: NotificationEventType,
  actorUserId: string | undefined,
  targetUserIds: string[],
  title: string,
  content: string,
  relatedObjectType?: string,
  relatedObjectId?: string,
  dedupeKey?: string
): Promise<number> => {
  // 获取用户邮箱和偏好
  const users = await prisma.user.findMany({
    where: { id: { in: targetUserIds } },
    select: { id: true, email: true },
  });

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: targetUserIds } },
  });

  const prefMap = new Map(preferences.map((p) => [p.userId, p]));

  let emailsSent = 0;

  for (const user of users) {
    if (!user.email) continue;

    const pref = prefMap.get(user.id);
    
    // 检查用户是否禁用邮件（PRD 要求强制发送，但保留偏好字段）
    // 如果邮件被禁用，仍然发送但记录
    const emailEnabled = pref?.emailEnabled !== false;

    // 检查是否需要即时发送
    const isImmediate = IMMEDIATE_EMAIL_EVENTS.includes(eventType);
    const batchInterval = EMAIL_BATCH_CONFIG[eventType];

    if (isImmediate || !batchInterval) {
      // 即时发送
      try {
        await sendEmail({
          to: user.email,
          title,
          content,
          eventType,
          actorUserId,
          targetUserId: user.id,
          relatedObjectType,
          relatedObjectId,
          dedupeKey: dedupeKey ? `${dedupeKey}_${user.id}_EMAIL` : undefined,
        });
        emailsSent++;
      } catch (error) {
        logger.error({ userId: user.id, eventType, error }, 'Failed to send email');
      }
    } else {
      // 加入批量队列
      const batchKey = `${user.id}_${eventType}`;
      const existing = batchQueue.get(batchKey);

      if (existing) {
        existing.items.push({ title, content, relatedObjectType, relatedObjectId });
      } else {
        batchQueue.set(batchKey, {
          userId: user.id,
          eventType,
          items: [{ title, content, relatedObjectType, relatedObjectId }],
          scheduledAt: Date.now() + batchInterval,
        });

        // 设置定时器发送
        setTimeout(() => {
          processBatchedEmails(batchKey, user.email!);
        }, batchInterval);
      }
      emailsSent++; // 计入队列
    }
  }

  return emailsSent;
};

/**
 * 处理批量邮件
 */
const processBatchedEmails = async (batchKey: string, email: string): Promise<void> => {
  const batch = batchQueue.get(batchKey);
  if (!batch) return;

  batchQueue.delete(batchKey);

  const { userId, eventType, items } = batch;

  // 生成合并内容
  const title = items.length === 1 
    ? items[0].title 
    : `您有 ${items.length} 条新通知`;
    
  const content = items.length === 1
    ? items[0].content
    : items.map((item, i) => `${i + 1}. ${item.title}: ${item.content}`).join('\n\n');

  try {
    await sendEmail({
      to: email,
      title,
      content,
      eventType,
      targetUserId: userId,
    });
  } catch (error) {
    logger.error({ userId, eventType, error }, 'Failed to send batched email');
  }
};

// ================================
// Outbox 管理（管理员）
// ================================

/**
 * 获取 Outbox 列表
 * PRD 23.6: GET /admin/notification-outbox
 * PRD 22.4: 默认最近 7 天
 */
export const listOutbox = async (
  query: ListOutboxQuery
): Promise<OutboxListResponse> => {
  const { channel, status, eventType, targetUserId, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (channel) where.channel = channel;
  if (status) where.status = status;
  if (eventType) where.eventType = eventType;
  if (targetUserId) where.targetUserId = targetUserId;
  
  // PRD 22.4: 默认最近 7 天
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  } else {
    // 默认 7 天
    where.createdAt = {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    };
  }

  const [items, total] = await Promise.all([
    prisma.notificationOutbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notificationOutbox.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      channel: item.channel as 'INBOX' | 'EMAIL',
      eventType: item.eventType,
      actorUserId: item.actorUserId,
      targetUserId: item.targetUserId,
      title: item.title,
      content: item.content,
      relatedObjectType: item.relatedObjectType,
      relatedObjectId: item.relatedObjectId,
      status: item.status as 'PENDING' | 'SENT' | 'FAILED',
      errorMessage: item.errorMessage,
      retryCount: item.retryCount,       // PRD 30.4
      nextRetryAt: item.nextRetryAt,     // PRD 30.4
      createdAt: item.createdAt,
      sentAt: item.sentAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取 Outbox 统计
 * PRD 30.4: 包含重试相关统计
 */
export const getOutboxStats = async (): Promise<OutboxStatsResponse> => {
  const MAX_RETRY_COUNT = 5;
  
  const [total, byStatus, byChannel, retryable, maxRetriesReached] = await Promise.all([
    prisma.notificationOutbox.count(),
    prisma.notificationOutbox.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.notificationOutbox.groupBy({
      by: ['channel', 'status'],
      _count: true,
    }),
    // 可重试的失败数（未达最大重试次数）
    prisma.notificationOutbox.count({
      where: {
        status: 'FAILED',
        retryCount: { lt: MAX_RETRY_COUNT },
      },
    }),
    // 已达最大重试次数的失败数
    prisma.notificationOutbox.count({
      where: {
        status: 'FAILED',
        retryCount: { gte: MAX_RETRY_COUNT },
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const item of byStatus) {
    statusCounts[item.status] = item._count;
  }

  const channelStats: Record<string, Record<string, number>> = {
    INBOX: { total: 0, pending: 0, sent: 0, failed: 0 },
    EMAIL: { total: 0, pending: 0, sent: 0, failed: 0 },
  };

  for (const item of byChannel) {
    const channel = item.channel;
    const status = item.status.toLowerCase();
    channelStats[channel][status] = item._count;
    channelStats[channel].total += item._count;
  }

  return {
    total,
    pending: statusCounts.PENDING || 0,
    sent: statusCounts.SENT || 0,
    failed: statusCounts.FAILED || 0,
    retryable,
    maxRetriesReached,
    byChannel: {
      INBOX: channelStats.INBOX as { total: number; pending: number; sent: number; failed: number },
      EMAIL: channelStats.EMAIL as { total: number; pending: number; sent: number; failed: number },
    },
  };
};

/**
 * 重试失败的通知
 */
export const retryFailedOutbox = async (outboxId: string): Promise<boolean> => {
  const outbox = await prisma.notificationOutbox.findUnique({
    where: { id: outboxId },
  });

  if (!outbox || outbox.status !== 'FAILED' || outbox.channel !== 'EMAIL') {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: outbox.targetUserId },
    select: { email: true },
  });

  if (!user?.email) {
    return false;
  }

  try {
    await sendEmail({
      to: user.email,
      title: outbox.title,
      content: outbox.content,
      eventType: outbox.eventType,
      actorUserId: outbox.actorUserId || undefined,
      targetUserId: outbox.targetUserId,
      relatedObjectType: outbox.relatedObjectType || undefined,
      relatedObjectId: outbox.relatedObjectId || undefined,
    });
    return true;
  } catch {
    return false;
  }
};

// ================================
// 用户通知偏好
// ================================

/**
 * 获取用户通知偏好
 */
export const getPreference = async (
  userId: string
): Promise<NotificationPreferenceResponse> => {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
    // 创建默认偏好
    pref = await prisma.notificationPreference.create({
      data: {
        userId,
        emailEnabled: true,
        dmEmailMode: 'BATCH_1MIN',
        communityEmailMode: 'BATCH_5MIN',
      },
    });
  }

  return {
    emailEnabled: pref.emailEnabled,
    dmEmailMode: pref.dmEmailMode as 'IMMEDIATE' | 'BATCH_1MIN',
    communityEmailMode: pref.communityEmailMode as 'IMMEDIATE' | 'BATCH_5MIN',
  };
};

/**
 * 更新用户通知偏好
 */
export const updatePreference = async (
  userId: string,
  input: UpdatePreferenceInput
): Promise<NotificationPreferenceResponse> => {
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      emailEnabled: input.emailEnabled ?? true,
      dmEmailMode: input.dmEmailMode ?? 'BATCH_1MIN',
      communityEmailMode: input.communityEmailMode ?? 'BATCH_5MIN',
    },
    update: {
      ...(input.emailEnabled !== undefined && { emailEnabled: input.emailEnabled }),
      ...(input.dmEmailMode && { dmEmailMode: input.dmEmailMode }),
      ...(input.communityEmailMode && { communityEmailMode: input.communityEmailMode }),
    },
  });

  return {
    emailEnabled: pref.emailEnabled,
    dmEmailMode: pref.dmEmailMode as 'IMMEDIATE' | 'BATCH_1MIN',
    communityEmailMode: pref.communityEmailMode as 'IMMEDIATE' | 'BATCH_5MIN',
  };
};

