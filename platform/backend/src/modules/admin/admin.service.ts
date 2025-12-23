/**
 * 管理员控制台服务 - Node 9
 * PRD 22: 管理员控制台（v3 增量）
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import type {
  DashboardStatsResponse,
  ListAuditLogsQuery,
  AuditLogListResponse,
  VenueOccupancyQuery,
  VenueOccupancyResponse,
  AdminBookingListQuery,
  SystemConfigResponse,
  UpdateSystemConfigInput,
} from './admin.dto.js';

// ================================
// 仪表盘统计
// ================================

/**
 * 获取管理员仪表盘统计
 * PRD 22.1: 管理员控制台导航
 */
export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  try {
    console.log('[DEBUG] getDashboardStats: Starting');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 逐个执行查询以定位问题
    console.log('[DEBUG] Query 1: projectTotal');
    const projectTotal = await prisma.project.count({ where: { isDeleted: false } });
    console.log('[DEBUG] Query 2: projectPending');
    const projectPending = await prisma.project.count({ where: { isDeleted: false, reviewStatus: 'PENDING_REVIEW' } });
    console.log('[DEBUG] Query 3: projectActive');
    const projectActive = await prisma.project.count({ where: { isDeleted: false, businessStatus: 'ONGOING' } });
    console.log('[DEBUG] Query 4: projectCompleted');
    const projectCompleted = await prisma.project.count({ where: { isDeleted: false, businessStatus: 'COMPLETED' } });
    console.log('[DEBUG] Query 5: demandTotal');
    const demandTotal = await prisma.demand.count({ where: { isDeleted: false } });
    console.log('[DEBUG] Query 6: demandOpen');
    const demandOpen = await prisma.demand.count({ where: { isDeleted: false, status: 'OPEN' } });
    console.log('[DEBUG] Query 7: responseCount');
    const responseCount = await prisma.demandResponse.count({ where: { isDeleted: false } });
    console.log('[DEBUG] Query 8: tokenAccounts');
    const tokenAccounts = await prisma.tokenAccount.aggregate({ _sum: { balance: true } });
    console.log('[DEBUG] Query 9: pendingTransfers');
    const pendingTransfers = await prisma.tokenTransaction.count({ where: { status: 'PENDING_ADMIN_APPROVAL' } });
    console.log('[DEBUG] Query 10: pendingGrants');
    const pendingGrants = await prisma.tokenGrantTask.count({ where: { status: 'PENDING' } });
    console.log('[DEBUG] Query 11: venueTotal');
    const venueTotal = await prisma.venue.count();
    console.log('[DEBUG] Query 12: venueActive');
    const venueActive = await prisma.venue.count({ where: { status: 'ACTIVE' } });
    console.log('[DEBUG] Query 13: todayBookings');
    const todayBookings = await prisma.venueBooking.count({
      where: {
        isDeleted: false,
        startTime: { gte: todayStart, lt: todayEnd },
      },
    });
    console.log('[DEBUG] Query 14: weekBookings');
    const weekBookings = await prisma.venueBooking.count({
      where: {
        isDeleted: false,
        startTime: { gte: weekStart, lt: todayEnd },
      },
    });
    console.log('[DEBUG] Query 15: meetingTotal');
    const meetingTotal = await prisma.meeting.count({ where: { isDeleted: false } });
    console.log('[DEBUG] Query 16: upcomingMeetings');
    const upcomingMeetings = await prisma.meeting.count({
      where: {
        isDeleted: false,
        status: 'SCHEDULED',
        startTime: { gt: now },
      },
    });
    console.log('[DEBUG] Query 17: todayMeetings');
    const todayMeetings = await prisma.meeting.count({
      where: {
        isDeleted: false,
        startTime: { gte: todayStart, lt: todayEnd },
      },
    });
    console.log('[DEBUG] Query 18: pendingEmails');
    const pendingEmails = await prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'PENDING' } });
    console.log('[DEBUG] Query 19: failedEmails');
    const failedEmails = await prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'FAILED' } });
    console.log('[DEBUG] Query 20: todaySentEmails');
    const todaySentEmails = await prisma.notificationOutbox.count({
      where: {
        channel: 'EMAIL',
        status: 'SENT',
        sentAt: { gte: todayStart },
      },
    });
    console.log('[DEBUG] Query 21: userTotal');
    const userTotal = await prisma.user.count({ where: { isDeleted: false } });
    console.log('[DEBUG] Query 22: activeUsers');
    const activeUsers = await prisma.user.count({
      where: {
        isDeleted: false,
        updatedAt: { gte: weekStart },
      },
    });
    console.log('[DEBUG] All queries completed');

  return {
    projects: {
      total: projectTotal,
      pending: projectPending,
      active: projectActive,
      completed: projectCompleted,
    },
    demands: {
      total: demandTotal,
      open: demandOpen,
      responseCount,
    },
    tokens: {
      totalCirculation: Number(tokenAccounts._sum.balance || 0),
      pendingTransfers,
      pendingGrants,
    },
    venues: {
      total: venueTotal,
      active: venueActive,
      todayBookings,
      weekBookings,
    },
    meetings: {
      total: meetingTotal,
      upcoming: upcomingMeetings,
      todayCount: todayMeetings,
    },
    notifications: {
      pendingEmails,
      failedEmails,
      todaySent: todaySentEmails,
    },
    users: {
      total: userTotal,
      activeThisWeek: activeUsers,
    },
  };
  } catch (error) {
    logger.error({ error }, '获取仪表盘统计失败');
    throw error;
  }
};

/**
 * 获取快捷操作统计
 * PRD 22.1: 管理员控制台导航
 */
export interface QuickActionsResponse {
  pendingProjects: number;
  pendingTransfers: number;
  pendingGrants: number;
  pendingArbitrations: number;
  failedEmails: number;
  pendingFeedbacks: number;
  total: number;
}

export const getQuickActions = async (): Promise<QuickActionsResponse> => {
  try {
    console.log('[DEBUG] getQuickActions: Starting');
    console.log('[DEBUG] QA Query 1: pendingProjects');
    const pendingProjects = await prisma.project.count({ where: { isDeleted: false, reviewStatus: 'PENDING_REVIEW' } });
    console.log('[DEBUG] QA Query 2: pendingTransfers');
    const pendingTransfers = await prisma.tokenTransaction.count({ where: { status: 'PENDING_ADMIN_APPROVAL' } });
    console.log('[DEBUG] QA Query 3: pendingGrants');
    const pendingGrants = await prisma.tokenGrantTask.count({ where: { status: 'PENDING' } });
    console.log('[DEBUG] QA Query 4: pendingArbitrations');
    const pendingArbitrations = await prisma.demandResponse.count({ where: { isDeleted: false, status: 'PENDING_ADMIN_ARBITRATION' } });
    console.log('[DEBUG] QA Query 5: failedEmails');
    const failedEmails = await prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'FAILED' } });
    console.log('[DEBUG] QA Query 6: pendingFeedbacks');
    const pendingFeedbacks = await prisma.feedback.count({ where: { status: 'PENDING' } });
    console.log('[DEBUG] getQuickActions: All queries completed');

    return {
      pendingProjects,
      pendingTransfers,
      pendingGrants,
      pendingArbitrations,
      failedEmails,
      pendingFeedbacks,
      total: pendingProjects + pendingTransfers + pendingGrants + pendingArbitrations + failedEmails + pendingFeedbacks,
    };
  } catch (error) {
    console.error('[DEBUG] getQuickActions error:', error);
    logger.error({ error }, '获取快捷操作统计失败');
    throw error;
  }
};

// ================================
// 审计日志
// ================================

/**
 * 获取审计日志列表
 * PRD 22.1.10: 审计日志
 */
export const listAuditLogs = async (
  query: ListAuditLogsQuery
): Promise<AuditLogListResponse> => {
  const { userId, action, objectType, objectId, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (objectType) where.objectType = objectType;
  if (objectId) where.objectId = objectId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      userId: item.userId,
      userName: item.user?.name || undefined,
      action: item.action,
      objectType: item.objectType,
      objectId: item.objectId,
      summary: item.summary,
      metadata: item.metadata as Record<string, unknown> | null,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      createdAt: item.createdAt.toISOString(),
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
// 场地占用率统计
// ================================

/**
 * 获取场地占用率统计
 * PRD 22.2: 查看场地占用率统计（按周/月）
 */
export const getVenueOccupancy = async (
  query: VenueOccupancyQuery
): Promise<VenueOccupancyResponse[]> => {
  const { venueId, period } = query;
  
  const now = new Date();
  const periodDays = period === 'week' ? 7 : 30;
  const startDate = query.from 
    ? new Date(query.from) 
    : new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const endDate = query.to ? new Date(query.to) : now;

  // 获取场地列表
  const venueWhere: Record<string, unknown> = { status: 'ACTIVE' };
  if (venueId) venueWhere.id = venueId;

  const venues = await prisma.venue.findMany({
    where: venueWhere,
    select: { id: true, name: true },
  });

  const results: VenueOccupancyResponse[] = [];

  for (const venue of venues) {
    // 获取该场地的预约
    const bookings = await prisma.venueBooking.findMany({
      where: {
        venueId: venue.id,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        startTime: { gte: startDate, lte: endDate },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // 按日期统计
    const bookingsByDay: Array<{ date: string; count: number; hours: number }> = [];
    const dayMap = new Map<string, { count: number; hours: number }>();

    for (const booking of bookings) {
      const dateKey = booking.startTime.toISOString().split('T')[0];
      const hours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
      
      const existing = dayMap.get(dateKey) || { count: 0, hours: 0 };
      existing.count++;
      existing.hours += hours;
      dayMap.set(dateKey, existing);
    }

    for (const [date, stats] of dayMap) {
      bookingsByDay.push({ date, ...stats });
    }
    bookingsByDay.sort((a, b) => a.date.localeCompare(b.date));

    // 计算占用率（假设每天 10 小时可用时段）
    const totalSlots = periodDays * 10; // 10 小时/天
    const bookedHours = bookings.reduce((sum, b) => {
      return sum + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
    }, 0);
    const occupancyRate = Math.round((bookedHours / totalSlots) * 100);

    results.push({
      venueId: venue.id,
      venueName: venue.name,
      period,
      totalSlots,
      bookedSlots: bookings.length,
      occupancyRate: Math.min(occupancyRate, 100),
      bookingsByDay,
    });
  }

  return results;
};

// ================================
// 预约管理列表
// ================================

/**
 * 获取预约管理列表（管理员）
 * PRD 22.2: 预约列表（筛选：场地/日期/创建人/状态/是否含餐）
 */
export const listAdminBookings = async (query: AdminBookingListQuery) => {
  const { venueId, date, ownerId, status, hasMeal, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = { isDeleted: false };

  if (venueId) where.venueId = venueId;
  if (ownerId) where.ownerUserId = ownerId;
  if (status) where.status = status;
  if (hasMeal !== undefined) where.hasMeal = hasMeal;

  // 日期筛选
  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.startTime = { gte: dayStart, lt: dayEnd };
  } else if (from || to) {
    where.startTime = {};
    if (from) (where.startTime as Record<string, Date>).gte = new Date(from);
    if (to) (where.startTime as Record<string, Date>).lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.venueBooking.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venueBooking.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      title: item.title,
      venueId: item.venueId,
      venueName: item.venue.name,
      ownerUserId: item.ownerUserId,
      ownerName: item.owner.name,
      startTime: item.startTime.toISOString(),
      endTime: item.endTime.toISOString(),
      status: item.status,
      hasMeal: item.hasMeal,
      mealType: item.mealType,
      mealStartTime: item.mealStartTime?.toISOString() || null,
      mealEndTime: item.mealEndTime?.toISOString() || null,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
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
// 项目审核
// ================================

/**
 * 获取待审核项目列表
 * PRD 22.1.1: 项目审核与治理
 */
export const listPendingProjects = async (page: number = 1, pageSize: number = 20) => {
  const where = { isDeleted: false, reviewStatus: 'PENDING_REVIEW' as const };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ownerUserId: item.createdById,
      ownerName: item.createdBy.name,
      status: item.reviewStatus,
      createdAt: item.createdAt.toISOString(),
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
// 响应裁决
// ================================

/**
 * 获取待裁决响应列表
 * PRD 22.1.2: 需求/响应裁决
 */
export const listPendingArbitrations = async (page: number = 1, pageSize: number = 20) => {
  const where = {
    isDeleted: false,
    OR: [
      { modifyStatus: 'PENDING' },
      { abandonStatus: 'PENDING' },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.demandResponse.findMany({
      where,
      include: {
        responder: { select: { id: true, name: true } },
        demand: {
          select: {
            id: true,
            title: true,
            ownerUser: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.demandResponse.count({ where }),
  ]);

  return {
    data: items.map((item) => ({
      id: item.id,
      demandId: item.demandId,
      demandTitle: item.demand.title,
      demandOwnerId: item.demand.ownerUser?.id,
      demandOwnerName: item.demand.ownerUser?.name,
      responderId: item.responderId,
      responderName: item.responder.name,
      status: item.status,
      modifyStatus: item.modifyStatus,
      abandonStatus: item.abandonStatus,
      modifyRequestReason: item.modifyRequestReason,
      abandonRequestReason: item.abandonRequestReason,
      updatedAt: item.updatedAt.toISOString(),
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
// 预约导出
// ================================

/**
 * 导出预约列表为 CSV 格式
 * PRD 22.2: 一键导出（可选）
 */
export const exportBookingsToCSV = async (query: AdminBookingListQuery): Promise<string> => {
  const { venueId, date, ownerId, status, hasMeal, from, to } = query;

  const where: Record<string, unknown> = { isDeleted: false };

  if (venueId) where.venueId = venueId;
  if (ownerId) where.ownerUserId = ownerId;
  if (status) where.status = status;
  if (hasMeal !== undefined) where.hasMeal = hasMeal;

  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    where.startTime = { gte: dayStart, lt: dayEnd };
  } else if (from || to) {
    where.startTime = {};
    if (from) (where.startTime as Record<string, Date>).gte = new Date(from);
    if (to) (where.startTime as Record<string, Date>).lte = new Date(to);
  }

  const items = await prisma.venueBooking.findMany({
    where,
    include: {
      venue: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { startTime: 'desc' },
    take: 10000, // 最多导出 10000 条
  });

  // 生成 CSV 内容
  const headers = [
    '预约ID',
    '标题',
    '场地',
    '预约人',
    '开始时间',
    '结束时间',
    '状态',
    '是否含餐',
    '餐别',
    '备注',
    '创建时间',
  ];

  const rows = items.map((item) => [
    item.id,
    item.title,
    item.venue.name,
    item.owner.name,
    item.startTime.toISOString(),
    item.endTime.toISOString(),
    item.status,
    item.hasMeal ? '是' : '否',
    item.mealType || '',
    item.note || '',
    item.createdAt.toISOString(),
  ]);

  // 添加 BOM 头以支持中文
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  logger.info({ query, count: items.length }, '预约列表导出');

  return csvContent;
};

// ================================
// 系统配置
// ================================

/**
 * 获取系统配置
 */
export const getSystemConfig = async (): Promise<SystemConfigResponse> => {
  // 从内存中的系统配置读取
  const sysConfig = await import('../../utils/systemConfig.js');
  const config = sysConfig.getSystemConfig();
  
  return {
    tokenInitialAmounts: {
      PARTNER: config.tokenInitialAmounts.PARTNER,
      RESOURCE_PARTNER: config.tokenInitialAmounts.CORE_PARTNER,
      LIMITED_PARTNER: config.tokenInitialAmounts.FOUNDER,
    },
    grantDefaults: {
      GOVERNMENT: config.guestRewardDefaults.MINISTRY_LEADER,
      ENTERPRISE: config.guestRewardDefaults.PUBLIC_CO_DMHG,
      INVESTMENT: config.guestRewardDefaults.FIN_EXEC,
      OTHER: config.guestRewardDefaults.OTHER,
    },
    emailBatching: {
      dmBatchMinutes: Math.floor(config.emailThrottling.dmBatchSeconds / 60),
      communityBatchMinutes: Math.floor(config.emailThrottling.communityBatchSeconds / 60),
      projectBatchMinutes: 10,
    },
    selfRegistrationInviteCode: config.selfRegistrationInviteCode,
    allowSelfRegistration: config.allowSelfRegistration,
  };
};

/**
 * 更新系统配置
 */
export const updateSystemConfig = async (
  input: UpdateSystemConfigInput
): Promise<SystemConfigResponse> => {
  logger.info({ input }, '更新系统配置');
  
  // 更新内存中的系统配置
  const { updateSystemConfig: updateConfig, getSystemConfig: getSysConfig } = await import('../../utils/systemConfig.js');
  
  const updates: Partial<{
    selfRegistrationInviteCode: string;
    allowSelfRegistration: boolean;
  }> = {};
  
  if (input.selfRegistrationInviteCode !== undefined) {
    updates.selfRegistrationInviteCode = input.selfRegistrationInviteCode;
  }
  
  if (input.allowSelfRegistration !== undefined) {
    updates.allowSelfRegistration = input.allowSelfRegistration;
  }
  
  if (Object.keys(updates).length > 0) {
    updateConfig(updates);
    logger.info({ updates, newConfig: getSysConfig() }, '系统配置已更新');
  }
  
  return getSystemConfig();
};

