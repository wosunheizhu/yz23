/**
 * 管理员仪表盘路由 - Node 9
 * PRD 22.1: 管理员控制台导航
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { prisma } from '../../utils/db.js';

const router: Router = Router();

// 所有路由需要管理员权限
router.use(authenticate);
router.use(adminOnly);

// ================================
// 快速操作入口
// ================================

/**
 * GET /admin/dashboard/quick-actions
 * 获取待处理任务数量
 */
router.get('/quick-actions', async (_req: Request, res: Response) => {
  console.log('[DEBUG] Entering dashboard.router /quick-actions handler');
  const [
    pendingProjects,
    pendingTransfers,
    pendingGrants,
    pendingArbitrations,
    failedEmails,
  ] = await Promise.all([
    prisma.project.count({ where: { isDeleted: false, reviewStatus: 'PENDING_REVIEW' } }),
    prisma.tokenTransaction.count({ where: { status: 'PENDING_ADMIN_APPROVAL' } }),
    prisma.tokenGrantTask.count({ where: { status: 'PENDING' } }),
    prisma.demandResponse.count({
      where: {
        isDeleted: false,
        OR: [{ modifyStatus: 'PENDING' }, { abandonStatus: 'PENDING' }],
      },
    }),
    prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'FAILED' } }),
  ]);

  res.json({
    pendingProjects,
    pendingTransfers,
    pendingGrants,
    pendingArbitrations,
    failedEmails,
    total: pendingProjects + pendingTransfers + pendingGrants + pendingArbitrations,
  });
});

/**
 * GET /admin/dashboard/recent-activities
 * 获取最近活动（审计日志）
 */
router.get('/recent-activities', async (_req: Request, res: Response) => {
  const activities = await prisma.auditLog.findMany({
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json(
    activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user?.name,
      action: a.action,
      objectType: a.objectType,
      objectId: a.objectId,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

/**
 * GET /admin/dashboard/today-schedule
 * 获取今日日程（会议+预约）
 */
router.get('/today-schedule', async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [meetings, bookings] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        isDeleted: false,
        startTime: { gte: todayStart, lt: todayEnd },
      },
      include: {
        venue: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.venueBooking.findMany({
      where: {
        isDeleted: false,
        startTime: { gte: todayStart, lt: todayEnd },
      },
      include: {
        venue: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  const schedule = [
    ...meetings.map((m) => ({
      type: 'MEETING' as const,
      id: m.id,
      title: m.topic,
      venueName: m.venue?.name,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
      status: m.status,
    })),
    ...bookings.map((b) => ({
      type: 'BOOKING' as const,
      id: b.id,
      title: b.title,
      venueName: b.venue.name,
      ownerName: b.owner.name,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      hasMeal: b.hasMeal,
    })),
  ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  res.json(schedule);
});

/**
 * GET /admin/dashboard/token-overview
 * 获取 Token 概览
 */
router.get('/token-overview', async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalBalance,
    totalAccounts,
    todayTransactions,
    weekTransactions,
    pendingTransfers,
    recentTransactions,
  ] = await Promise.all([
    prisma.tokenAccount.aggregate({ _sum: { balance: true } }),
    prisma.tokenAccount.count(),
    prisma.tokenTransaction.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.tokenTransaction.count({
      where: { createdAt: { gte: weekStart } },
    }),
    prisma.tokenTransaction.count({
      where: { status: 'PENDING_ADMIN_APPROVAL' },
    }),
    prisma.tokenTransaction.findMany({
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  res.json({
    totalBalance: Number(totalBalance._sum.balance || 0),
    totalAccounts,
    todayTransactions,
    weekTransactions,
    pendingTransfers,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      type: t.transactionType,
      amount: Number(t.amount),
      fromUserName: t.fromUser?.name,
      toUserName: t.toUser?.name,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

/**
 * GET /admin/dashboard/notification-health
 * 获取通知系统健康状态
 */
router.get('/notification-health', async (_req: Request, res: Response) => {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    pendingCount,
    failedCount,
    sentLastHour,
    sentLastDay,
    failedLastDay,
    oldestPending,
  ] = await Promise.all([
    prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'PENDING' } }),
    prisma.notificationOutbox.count({ where: { channel: 'EMAIL', status: 'FAILED' } }),
    prisma.notificationOutbox.count({
      where: { channel: 'EMAIL', status: 'SENT', sentAt: { gte: hourAgo } },
    }),
    prisma.notificationOutbox.count({
      where: { channel: 'EMAIL', status: 'SENT', sentAt: { gte: dayAgo } },
    }),
    prisma.notificationOutbox.count({
      where: { channel: 'EMAIL', status: 'FAILED', createdAt: { gte: dayAgo } },
    }),
    prisma.notificationOutbox.findFirst({
      where: { channel: 'EMAIL', status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  // 计算健康度
  const successRate = sentLastDay > 0 
    ? Math.round((sentLastDay / (sentLastDay + failedLastDay)) * 100) 
    : 100;
  
  const health = failedCount === 0 && pendingCount < 100 
    ? 'HEALTHY' 
    : failedCount > 50 || pendingCount > 500 
      ? 'CRITICAL' 
      : 'WARNING';

  res.json({
    health,
    pending: pendingCount,
    failed: failedCount,
    sentLastHour,
    sentLastDay,
    successRate,
    oldestPendingAt: oldestPending?.createdAt?.toISOString() || null,
  });
});

export { router as adminDashboardRouter };

