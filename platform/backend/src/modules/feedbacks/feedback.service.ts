/**
 * 意见反馈服务 - Node 9
 * PRD 6.9.2: 意见反馈（Feedback）
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import type {
  CreateFeedbackInput,
  ProcessFeedbackInput,
  ListFeedbacksQuery,
  FeedbackResponse,
  FeedbackListResponse,
  FeedbackStatsResponse,
} from './feedback.dto.js';

// ================================
// 创建反馈
// ================================

/**
 * 创建意见反馈
 * PRD 6.9.2.1: 任何合伙人可通过"意见反馈"入口向管理员发送反馈
 */
export const createFeedback = async (
  input: CreateFeedbackInput,
  userId: string
): Promise<FeedbackResponse> => {
  const { feedbackType, title, content, wantContact, contactInfo } = input;

  const feedback = await prisma.feedback.create({
    data: {
      userId,
      feedbackType,
      title,
      content,
      wantContact,
      contactInfo: wantContact ? contactInfo : null,
      status: 'PENDING',
    },
    include: {
      user: { select: { name: true } },
    },
  });

  // 通知所有管理员
  const admins = await prisma.user.findMany({
    where: { isDeleted: false, isAdmin: true },
    select: { id: true },
  });

  if (admins.length > 0) {
    await sendNotification({
      eventType: 'FEEDBACK_SUBMITTED',
      actorId: userId,
      targetUserIds: admins.map((a) => a.id),
      title: `新意见反馈: ${title}`,
      content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      relatedObjectType: 'FEEDBACK',
      relatedObjectId: feedback.id,
      channels: ['INBOX'],
    });
  }

  logger.info({ feedbackId: feedback.id, userId }, '意见反馈已提交');

  return formatFeedback(feedback);
};

// ================================
// 获取反馈列表
// ================================

/**
 * 获取意见反馈列表（管理员）
 * PRD 6.9.2.2: 管理员在后台有"意见反馈列表"
 */
export const listFeedbacks = async (
  query: ListFeedbacksQuery
): Promise<FeedbackListResponse> => {
  const { status, feedbackType, userId, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (feedbackType) where.feedbackType = feedbackType;
  if (userId) where.userId = userId;

  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  return {
    data: items.map(formatFeedback),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取我的反馈列表
 */
export const listMyFeedbacks = async (
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<FeedbackListResponse> => {
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  return {
    data: items.map(formatFeedback),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取反馈详情
// ================================

/**
 * 获取反馈详情
 */
export const getFeedbackById = async (
  id: string
): Promise<FeedbackResponse | null> => {
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
    },
  });

  return feedback ? formatFeedback(feedback) : null;
};

// ================================
// 管理员处理反馈
// ================================

/**
 * 处理意见反馈
 * PRD 6.9.2.2: 可以填入"处理结果/回复"，该回复将通过信箱通知给反馈人
 */
export const processFeedback = async (
  id: string,
  input: ProcessFeedbackInput,
  adminId: string
): Promise<FeedbackResponse> => {
  const feedback = await prisma.feedback.update({
    where: { id },
    data: {
      status: 'PROCESSED',
      response: input.response,
    },
    include: {
      user: { select: { name: true } },
    },
  });

  // 记录审计日志
  await createAuditLog({
    userId: adminId,
    action: 'PROCESS',
    objectType: 'FEEDBACK',
    objectId: id,
    summary: `处理意见反馈: ${feedback.title}`,
    metadata: { response: input.response },
  });

  // 通知反馈人
  await sendNotification({
    eventType: 'FEEDBACK_PROCESSED',
    actorId: adminId,
    targetUserIds: [feedback.userId],
    title: `您的反馈已处理: ${feedback.title}`,
    content: input.response,
    relatedObjectType: 'FEEDBACK',
    relatedObjectId: id,
    channels: ['INBOX', 'EMAIL'],
  });

  logger.info({ feedbackId: id, adminId }, '意见反馈已处理');

  return formatFeedback(feedback);
};

// ================================
// 反馈统计
// ================================

/**
 * 获取反馈统计（管理员）
 */
export const getFeedbackStats = async (): Promise<FeedbackStatsResponse> => {
  const [total, pending, processed, suggestion, bug, rule, complaint, other] = await Promise.all([
    prisma.feedback.count(),
    prisma.feedback.count({ where: { status: 'PENDING' } }),
    prisma.feedback.count({ where: { status: 'PROCESSED' } }),
    prisma.feedback.count({ where: { feedbackType: 'SUGGESTION' } }),
    prisma.feedback.count({ where: { feedbackType: 'BUG' } }),
    prisma.feedback.count({ where: { feedbackType: 'RULE' } }),
    prisma.feedback.count({ where: { feedbackType: 'COMPLAINT' } }),
    prisma.feedback.count({ where: { feedbackType: 'OTHER' } }),
  ]);

  return {
    total,
    pending,
    processed,
    byType: {
      SUGGESTION: suggestion,
      BUG: bug,
      RULE: rule,
      COMPLAINT: complaint,
      OTHER: other,
    },
  };
};

// ================================
// 辅助函数
// ================================

const formatFeedback = (feedback: any): FeedbackResponse => ({
  id: feedback.id,
  userId: feedback.userId,
  userName: feedback.user?.name,
  feedbackType: feedback.feedbackType,
  title: feedback.title,
  content: feedback.content,
  wantContact: feedback.wantContact,
  contactInfo: feedback.contactInfo,
  status: feedback.status,
  response: feedback.response,
  createdAt: feedback.createdAt.toISOString(),
  updatedAt: feedback.updatedAt.toISOString(),
});

