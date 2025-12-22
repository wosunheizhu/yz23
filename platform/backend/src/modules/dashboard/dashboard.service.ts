/**
 * 用户仪表盘服务 - Node 10
 * PRD 6.8: 仪表盘模块
 */

import { prisma } from '../../utils/db.js';
import type {
  DashboardQuery,
  MyProjectSummary,
  MyTodoItem,
  TokenSummary,
  MyContributionStats,
  PlatformValueCurve,
  InboxBadge,
  DashboardResponse,
} from './dashboard.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 仪表盘主接口
// ================================

/**
 * 获取用户仪表盘数据
 * PRD 6.8: 仪表盘模块
 */
export const getDashboard = async (
  userId: string,
  query: DashboardQuery,
  isAdmin: boolean = false
): Promise<DashboardResponse> => {
  // 并行获取所有数据
  const [
    user,
    myProjects,
    myTodos,
    tokenSummary,
    contributions,
    platformValue,
    inboxBadge,
  ] = await Promise.all([
    getUserInfo(userId),
    getMyProjects(userId, query.projectLimit),
    getMyTodos(userId, query.todoLimit, isAdmin),
    getTokenSummary(userId, query.transactionLimit),
    getMyContributions(userId),
    getPlatformValueCurve(userId),
    getInboxBadge(userId),
  ]);

  return {
    user,
    tokenBalance: tokenSummary.balance,
    inboxUnread: inboxBadge.total,
    myProjects,
    myTodos,
    tokenSummary,
    contributions,
    platformValue,
    inboxBadge,
  };
};

// ================================
// 用户信息
// ================================

const getUserInfo = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      roleLevel: true,
      avatar: true,
    },
  });

  return {
    id: user?.id || userId,
    name: user?.name || '未知用户',
    roleLevel: user?.roleLevel || 'PARTNER',
    avatar: user?.avatar || null,
  };
};

// ================================
// 我的项目
// ================================

/**
 * 获取我的项目列表
 * PRD 6.8.2: 我的项目 & 实时进程
 */
export const getMyProjects = async (
  userId: string,
  limit: number
): Promise<MyProjectSummary[]> => {
  // 获取用户作为负责人或成员的项目
  const projects = await prisma.project.findMany({
    where: {
      ...notDeleted,
      OR: [
        { members: { some: { userId } } },
        { createdById: userId },
      ],
    },
    select: {
      id: true,
      name: true,
      businessType: true,
      industry: true,
      businessStatus: true,
      members: {
        where: { userId },
        select: { role: true },
      },
      createdById: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  // TODO: 实际应用中应该记录用户最后查看时间，这里简化处理
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    businessType: p.businessType,
    industry: p.industry,
    businessStatus: p.businessStatus,
    role: p.members[0]?.role === 'LEADER' || p.createdById === userId ? 'LEADER' : 'MEMBER',
    hasNewEvents: false, // 需要实际记录用户阅读状态
    hasNewDemands: false,
    hasNewResponses: false,
  }));
};

// ================================
// 我的代办
// ================================

/**
 * 获取我的代办事项
 * PRD 6.8.2 D3: 代办区块
 */
export const getMyTodos = async (
  userId: string,
  limit: number,
  isAdmin?: boolean
): Promise<MyTodoItem[]> => {
  const todos: MyTodoItem[] = [];

  // 1. 待我审核的需求响应（我为项目负责人）
  const pendingResponses = await prisma.demandResponse.findMany({
    where: {
      ...notDeleted,
      status: 'SUBMITTED',
      demand: {
        ...notDeleted,
        project: {
          ...notDeleted,
          members: {
            some: { userId, role: 'LEADER' },
          },
        },
      },
    },
    include: {
      demand: {
        select: {
          name: true,
          project: { select: { id: true, name: true } },
        },
      },
      responder: { select: { name: true } },
    },
    take: limit,
  });

  pendingResponses.forEach((r) => {
    todos.push({
      id: `response-${r.id}`,
      type: 'RESPONSE_REVIEW',
      title: `「${r.demand.name}」收到新响应`,
      description: `${r.responder.name} 响应了您的需求，请及时审核`,
      projectId: r.demand.project.id,
      projectName: r.demand.project.name,
      relatedId: r.id,
      path: `/demands/${r.demandId}`,
      createdAt: r.createdAt.toISOString(),
      isNew: true,
    });
  });

  // 2. 待我确认的 Token 收款
  const pendingTokens = await prisma.tokenTransaction.findMany({
    where: {
      toUserId: userId,
      status: 'PENDING_RECEIVER_CONFIRM',
    },
    include: {
      fromUser: { select: { name: true } },
    },
    take: limit - todos.length,
  });

  pendingTokens.forEach((t) => {
    todos.push({
      id: `token-${t.id}`,
      type: 'TOKEN_CONFIRM',
      title: `收到 Token 转账`,
      description: `${t.fromUser?.name || '系统'} 向您转账 ${t.amount} Token，请确认`,
      relatedId: t.id,
      path: '/token',
      createdAt: t.createdAt.toISOString(),
      isNew: true,
    });
  });

  // 3. 待我处理的项目加入申请
  const joinRequests = await prisma.projectJoinRequest.findMany({
    where: {
      status: 'PENDING',
      project: {
        ...notDeleted,
        members: { some: { userId, role: 'LEADER' } },
      },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    take: limit - todos.length,
  });

  joinRequests.forEach((req) => {
    todos.push({
      id: `join-${req.id}`,
      type: 'JOIN_REQUEST',
      title: `项目「${req.project.name}」有新的加入申请`,
      description: `有人申请以${req.role === 'LEADER' ? '负责人' : '成员'}身份加入，请审批`,
      projectId: req.project.id,
      projectName: req.project.name,
      relatedId: req.id,
      path: `/projects/${req.projectId}`,
      createdAt: req.createdAt.toISOString(),
      isNew: true,
    });
  });

  // 4. 未读的站内信
  const unreadDMs = await prisma.directMessage.findMany({
    where: {
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    },
    include: {
      sender: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(0, limit - todos.length),
  });

  // 按发送者分组，只显示最新的
  const dmBySender = new Map<string, typeof unreadDMs[0]>();
  unreadDMs.forEach((dm) => {
    if (!dmBySender.has(dm.senderId)) {
      dmBySender.set(dm.senderId, dm);
    }
  });

  dmBySender.forEach((dm) => {
    todos.push({
      id: `dm-${dm.senderId}`,
      type: 'UNREAD_MESSAGE',
      title: `${dm.sender.name} 发来新消息`,
      description: dm.content.length > 50 ? dm.content.slice(0, 50) + '...' : dm.content,
      relatedId: dm.senderId,
      path: `/messages/${dm.senderId}`,
      createdAt: dm.createdAt.toISOString(),
      isNew: true,
    });
  });

  // 5. 管理员特有的待办事项
  if (isAdmin) {
    // 5.1 待审核的项目
    const pendingProjects = await prisma.project.findMany({
      where: {
        ...notDeleted,
        reviewStatus: 'PENDING_REVIEW',
      },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    pendingProjects.forEach((p) => {
      todos.push({
        id: `admin-project-${p.id}`,
        type: 'ADMIN_PROJECT_REVIEW',
        title: `项目「${p.name}」待审核`,
        description: '新项目待管理员审核通过',
        projectId: p.id,
        projectName: p.name,
        relatedId: p.id,
        path: `/projects/${p.id}`,
        createdAt: p.createdAt.toISOString(),
        isNew: true,
        isAdmin: true,
      });
    });

    // 5.2 待审批的 Token 转账
    const pendingTransfers = await prisma.tokenTransaction.findMany({
      where: { status: 'PENDING_ADMIN_APPROVAL' },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    pendingTransfers.forEach((t) => {
      todos.push({
        id: `admin-token-${t.id}`,
        type: 'ADMIN_TOKEN_REVIEW',
        title: `Token 转账待审批`,
        description: `${t.fromUser?.name} 向 ${t.toUser?.name} 转账 ${t.amount} Token`,
        relatedId: t.id,
        path: '/admin',
        createdAt: t.createdAt.toISOString(),
        isNew: true,
        isAdmin: true,
      });
    });

    // 5.3 待发放的 Token 任务
    const pendingGrants = await prisma.tokenGrantTask.findMany({
      where: { status: 'PENDING' },
      include: {
        inviter: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    pendingGrants.forEach((g) => {
      todos.push({
        id: `admin-grant-${g.id}`,
        type: 'ADMIN_GRANT_TASK',
        title: `Token 发放任务待处理`,
        description: `嘉宾邀请待发放 ${g.amount} Token`,
        relatedId: g.id,
        path: '/admin',
        createdAt: g.createdAt.toISOString(),
        isNew: true,
        isAdmin: true,
      });
    });
  }

  // 按时间排序，最新的在前
  todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return todos.slice(0, limit);
};

// ================================
// Token 摘要
// ================================

/**
 * 获取 Token 摘要
 * PRD 6.8.3: 我的 Token & 发起交易
 */
export const getTokenSummary = async (
  userId: string,
  transactionLimit: number
): Promise<TokenSummary> => {
  const account = await prisma.tokenAccount.findUnique({
    where: { userId },
  });

  const transactions = await prisma.tokenTransaction.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      status: 'COMPLETED',
    },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: transactionLimit,
  });

  return {
    balance: Number(account?.balance || 0),
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      type: t.direction,
      amount: t.fromUserId === userId ? -Number(t.amount) : Number(t.amount),
      counterpartyName: t.fromUserId === userId
        ? t.toUser?.name || null
        : t.fromUser?.name || null,
      reason: t.reason,
      createdAt: t.createdAt.toISOString(),
    })),
  };
};

// ================================
// 我的贡献
// ================================

/**
 * 获取我的贡献统计
 * PRD 6.8.4: 我的贡献
 */
export const getMyContributions = async (
  userId: string
): Promise<MyContributionStats> => {
  // 1. 我发布的资源
  const resources = await prisma.networkResource.findMany({
    where: { createdByUserId: userId, isDeleted: false },
    select: {
      id: true,
      name: true,
      resourceType: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const resourceCount = await prisma.networkResource.count({
    where: { createdByUserId: userId, isDeleted: false },
  });

  // 2. 我领导的项目
  const leadProjects = await prisma.project.findMany({
    where: {
      ...notDeleted,
      members: { some: { userId, role: 'LEADER' } },
    },
    select: {
      id: true,
      name: true,
      businessStatus: true,
      valueRecords: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. 我参与的项目（非负责人）
  const memberProjects = await prisma.project.findMany({
    where: {
      ...notDeleted,
      members: { some: { userId, role: 'MEMBER' } },
    },
    select: {
      id: true,
      name: true,
      businessStatus: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const memberProjectCount = await prisma.project.count({
    where: {
      ...notDeleted,
      members: { some: { userId, role: 'MEMBER' } },
    },
  });

  // 4. 我邀请的嘉宾（只统计已被管理员发放Token奖励的）
  // 包括座谈会嘉宾和线下到访记录
  const approvedTasks = await prisma.tokenGrantTask.findMany({
    where: { 
      inviterUserId: userId,
      status: 'APPROVED', // 只统计已发放奖励的
    },
    include: {
      guest: {
        select: { id: true, name: true, organization: true },
      },
      meeting: {
        select: { id: true, topic: true },
      },
      onsiteVisit: {
        select: { id: true, name: true, organization: true, purpose: true },
      },
    },
    orderBy: { decidedAt: 'desc' },
    take: 5,
  });

  const approvedTaskCount = await prisma.tokenGrantTask.count({
    where: { 
      inviterUserId: userId,
      status: 'APPROVED',
    },
  });

  // 格式化嘉宾数据
  const invitedGuests = approvedTasks.map((task) => {
    if (task.guest) {
      return {
        id: task.guest.id,
        name: task.guest.name,
        organization: task.guest.organization,
        meetingTitle: task.meeting?.topic || '',
        source: 'MEETING' as const,
      };
    } else if (task.onsiteVisit) {
      return {
        id: task.onsiteVisit.id,
        name: task.onsiteVisit.name,
        organization: task.onsiteVisit.organization,
        meetingTitle: task.onsiteVisit.purpose || '线下到访',
        source: 'ONSITE_VISIT' as const,
      };
    }
    return null;
  }).filter(Boolean);

  const totalCount = resourceCount + leadProjects.length + memberProjectCount + approvedTaskCount;

  return {
    totalCount,
    resources: {
      count: resourceCount,
      recent: resources.map((r) => ({
        id: r.id,
        name: r.name ?? '',
        category: r.resourceType,
        linkedProjectCount: 0, // TODO: 获取关联项目数
      })),
    },
    leadProjects: {
      count: leadProjects.length,
      projects: leadProjects.map((p) => ({
        id: p.id,
        name: p.name,
        businessStatus: p.businessStatus,
        hasValueRecord: p.valueRecords.length > 0,
      })),
    },
    memberProjects: {
      count: memberProjectCount,
      recent: memberProjects.map((p) => ({
        id: p.id,
        name: p.name,
        businessStatus: p.businessStatus,
      })),
    },
    invitedGuests: {
      count: approvedTaskCount,
      recent: invitedGuests.filter((g): g is NonNullable<typeof g> => g !== null).map((g) => ({
        id: g.id,
        name: g.name,
        organization: g.organization,
        meetingTitle: g.meetingTitle,
      })),
    },
  };
};

// ================================
// 平台价值曲线
// ================================

/**
 * 获取平台价值曲线
 * PRD 6.8.5: 元征平台价值曲线
 */
export const getPlatformValueCurve = async (
  userId: string
): Promise<PlatformValueCurve> => {
  // 获取用户角色以决定显示详细程度
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roleLevel: true, isAdmin: true },
  });

  const isHighLevel = user?.roleLevel === 'FOUNDER' || user?.isAdmin;

  // 获取所有价值记录
  const valueRecords = await prisma.valueRecord.findMany({
    orderBy: { recordedAt: 'asc' },
    select: {
      amount: true,
      recordedAt: true,
    },
  });

  // 按季度聚合
  const quarterMap = new Map<string, number>();
  let cumulative = 0;

  valueRecords.forEach((record) => {
    const date = new Date(record.recordedAt);
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const key = `${year}-Q${quarter}`;

    const current = quarterMap.get(key) || 0;
    quarterMap.set(key, current + Number(record.amount));
  });

  const dataPoints: Array<{
    period: string;
    cumulativeValue: number;
    periodValue: number;
  }> = [];

  // 按顺序累加
  const sortedKeys = Array.from(quarterMap.keys()).sort();
  sortedKeys.forEach((period) => {
    const periodValue = quarterMap.get(period) || 0;
    cumulative += periodValue;
    dataPoints.push({
      period,
      cumulativeValue: cumulative,
      periodValue,
    });
  });

  return {
    totalValue: cumulative,
    currency: 'CNY',
    dataPoints,
  };
};

// ================================
// 信箱统计
// ================================

/**
 * 获取信箱未读统计
 * PRD 6.8.6: 信箱入口
 */
export const getInboxBadge = async (userId: string): Promise<InboxBadge> => {
  const unreadItems = await prisma.inboxItem.findMany({
    where: { userId, isRead: false },
    select: { category: true },
  });

  const byCategory = {
    announcement: 0,
    system: 0,
    vote: 0,
    dm: 0,
    mention: 0,
  };

  unreadItems.forEach((item) => {
    switch (item.category) {
      case 'ANNOUNCEMENT':
        byCategory.announcement++;
        break;
      case 'SYSTEM':
        byCategory.system++;
        break;
      case 'VOTE':
        byCategory.vote++;
        break;
      case 'DM':
        byCategory.dm++;
        break;
      case 'MENTION':
        byCategory.mention++;
        break;
    }
  });

  // 还要加上未读私信
  const unreadDMs = await prisma.directMessage.count({
    where: {
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    },
  });

  byCategory.dm += unreadDMs;

  return {
    total: unreadItems.length + unreadDMs,
    byCategory,
  };
};

