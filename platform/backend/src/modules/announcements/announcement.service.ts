/**
 * 公告管理服务 - Node 9
 * PRD 6.12: 公告管理模块（管理员）
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  ListAnnouncementsQuery,
  AnnouncementResponse,
  AnnouncementListResponse,
} from './announcement.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 创建公告
// ================================

/**
 * 创建公告
 * PRD 6.12.2: 发布公告
 */
export const createAnnouncement = async (
  input: CreateAnnouncementInput,
  creatorId: string
): Promise<AnnouncementResponse> => {
  const {
    title,
    summary,
    content,
    attachments,
    priority,
    isPinned,
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds,
  } = input;

  const announcement = await prisma.announcement.create({
    data: {
      creatorId,
      title,
      summary,
      content,
      attachments: attachments || [],
      priority: priority || 'NORMAL',
      isPinned: isPinned || false,
      visibilityScopeType: visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
      visibilityMinRoleLevel,
      visibilityUserIds: visibilityUserIds || [],
    },
    include: {
      creator: { select: { name: true } },
    },
  });

  // 记录审计日志
  await createAuditLog({
    userId: creatorId,
    action: 'CREATE',
    objectType: 'ANNOUNCEMENT',
    objectId: announcement.id,
    summary: `发布公告: ${title}`,
    metadata: { visibilityScopeType },
  });

  // 获取可见用户并发送通知
  const targetUsers = await getVisibleUsers(
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds
  );

  if (targetUsers.length > 0) {
    await sendNotification({
      eventType: 'ANNOUNCEMENT',
      actorId: creatorId,
      targetUserIds: targetUsers.map((u) => u.id),
      title: `新公告: ${title}`,
      content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      relatedObjectType: 'ANNOUNCEMENT',
      relatedObjectId: announcement.id,
      channels: ['INBOX', 'EMAIL'],
    });
  }

  logger.info({ announcementId: announcement.id, creatorId }, '公告已发布');

  return formatAnnouncement(announcement);
};

// ================================
// 获取公告列表
// ================================

/**
 * 获取公告列表（管理员）
 */
export const listAnnouncements = async (
  query: ListAnnouncementsQuery
): Promise<AnnouncementListResponse> => {
  const { search, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = { ...notDeleted };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count({ where }),
  ]);

  return {
    data: items.map(formatAnnouncement),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取用户可见的公告列表
 */
export const listVisibleAnnouncements = async (
  userId: string,
  roleLevel: number,
  page: number = 1,
  pageSize: number = 20
): Promise<AnnouncementListResponse> => {
  const where = {
    ...notDeleted,
    OR: [
      { visibilityScopeType: 'ALL' },
      {
        visibilityScopeType: 'ROLE_MIN_LEVEL',
        visibilityMinRoleLevel: { lte: roleLevel },
      },
      {
        visibilityScopeType: 'CUSTOM',
        visibilityUserIds: { has: userId },
      },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count({ where }),
  ]);

  return {
    data: items.map(formatAnnouncement),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取公告详情
// ================================

/**
 * 获取公告详情
 */
export const getAnnouncementById = async (
  id: string
): Promise<AnnouncementResponse | null> => {
  const announcement = await prisma.announcement.findFirst({
    where: { id, ...notDeleted },
    include: {
      creator: { select: { name: true } },
    },
  });

  return announcement ? formatAnnouncement(announcement) : null;
};

// ================================
// 更新公告
// ================================

/**
 * 更新公告
 */
export const updateAnnouncement = async (
  id: string,
  input: UpdateAnnouncementInput,
  adminId: string
): Promise<AnnouncementResponse> => {
  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.content && { content: input.content }),
      ...(input.attachments && { attachments: input.attachments }),
      ...(input.priority && { priority: input.priority }),
      ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
    },
    include: {
      creator: { select: { name: true } },
    },
  });

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE',
    objectType: 'ANNOUNCEMENT',
    objectId: id,
    summary: `更新公告: ${announcement.title}`,
    metadata: input,
  });

  logger.info({ announcementId: id, adminId }, '公告已更新');

  return formatAnnouncement(announcement);
};

// ================================
// 删除公告（软删除）
// ================================

/**
 * 删除公告
 */
export const deleteAnnouncement = async (
  id: string,
  adminId: string
): Promise<void> => {
  const announcement = await prisma.announcement.update({
    where: { id },
    data: { isDeleted: true },
  });

  await createAuditLog({
    userId: adminId,
    action: 'DELETE',
    objectType: 'ANNOUNCEMENT',
    objectId: id,
    summary: `删除公告: ${announcement.title}`,
  });

  logger.info({ announcementId: id, adminId }, '公告已删除');
};

// ================================
// 辅助函数
// ================================

const formatAnnouncement = (announcement: any): AnnouncementResponse => ({
  id: announcement.id,
  creatorId: announcement.creatorId,
  creatorName: announcement.creator?.name,
  title: announcement.title,
  summary: announcement.summary,
  content: announcement.content,
  attachments: announcement.attachments || [],
  priority: announcement.priority || 'NORMAL',
  isPinned: announcement.isPinned || false,
  visibilityScopeType: announcement.visibilityScopeType,
  visibilityMinRoleLevel: announcement.visibilityMinRoleLevel,
  visibilityUserIds: announcement.visibilityUserIds || [],
  createdAt: announcement.createdAt.toISOString(),
  updatedAt: announcement.updatedAt.toISOString(),
});

const getVisibleUsers = async (
  scopeType: string,
  minRoleLevel?: number | null,
  userIds?: string[]
): Promise<{ id: string }[]> => {
  if (scopeType === 'ALL') {
    return prisma.user.findMany({
      where: { isDeleted: false },
      select: { id: true },
    });
  }

  if (scopeType === 'ROLE_MIN_LEVEL' && minRoleLevel !== undefined && minRoleLevel !== null) {
    const roleLevelMap: Record<number, string[]> = {
      0: ['FOUNDER', 'CORE_PARTNER', 'PARTNER'],
      1: ['FOUNDER', 'CORE_PARTNER'],
      2: ['FOUNDER'],
      3: ['FOUNDER'],
    };
    return prisma.user.findMany({
      where: {
        isDeleted: false,
        roleLevel: { in: roleLevelMap[minRoleLevel] || [] },
      },
      select: { id: true },
    });
  }

  if (scopeType === 'CUSTOM' && userIds && userIds.length > 0) {
    return prisma.user.findMany({
      where: {
        isDeleted: false,
        id: { in: userIds },
      },
      select: { id: true },
    });
  }

  return [];
};

