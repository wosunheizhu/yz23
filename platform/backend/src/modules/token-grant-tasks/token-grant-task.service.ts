/**
 * Token 发放任务 Service - Node 5
 * PRD 20: 会后 Token 发放任务
 * 扩展: 支持线下到访来源
 */

import { prisma } from '../../utils/db.js';
import { BusinessError, ERROR_CODES } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  ApproveTaskInput,
  RejectTaskInput,
  ListGrantTasksQuery,
  GrantTaskResponse,
  GrantTaskListResponse,
  GrantTaskStatsResponse,
  TaskSource,
  GuestHistoryWarning,
} from './token-grant-task.dto.js';

// 标准 include 配置，用于查询任务
const taskInclude = {
  meeting: {
    select: {
      id: true,
      topic: true,
      startTime: true,
      endTime: true,
      venue: { select: { id: true, name: true } },
    },
  },
  guest: {
    select: {
      id: true,
      name: true,
      organization: true,
      title: true,
      guestCategory: true,
    },
  },
  onsiteVisit: {
    select: {
      id: true,
      name: true,
      organization: true,
      title: true,
      guestCategory: true,
      visitDate: true,
      venue: { select: { id: true, name: true } },
    },
  },
  inviter: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
  adminUser: {
    select: {
      id: true,
      name: true,
    },
  },
};

// ================================
// 任务列表与详情
// ================================

/**
 * 获取发放任务列表（仅管理员）
 */
export const listGrantTasks = async (
  query: ListGrantTasksQuery
): Promise<GrantTaskListResponse> => {
  const { status, taskSource, meetingId, onsiteVisitId, inviterId, guestCategory, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (taskSource) {
    where.taskSource = taskSource;
  }

  if (meetingId) {
    where.meetingId = meetingId;
  }

  if (onsiteVisitId) {
    where.onsiteVisitId = onsiteVisitId;
  }

  if (inviterId) {
    where.inviterUserId = inviterId;
  }

  // 嘉宾分类筛选：需要同时检查 guest 和 onsiteVisit
  if (guestCategory) {
    where.OR = [
      { guest: { guestCategory } },
      { onsiteVisit: { guestCategory } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.tokenGrantTask.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenGrantTask.count({ where }),
  ]);

  // 并行处理所有任务的历史记录检查
  const formattedTasks = await Promise.all(tasks.map(formatGrantTaskResponse));

  return {
    data: formattedTasks,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取单个发放任务详情
 */
export const getGrantTaskById = async (
  taskId: string
): Promise<GrantTaskResponse> => {
  const task = await prisma.tokenGrantTask.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });

  if (!task) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      'Token 发放任务不存在'
    );
  }

  return await formatGrantTaskResponse(task);
};

/**
 * 审核通过发放任务
 * PRD 20.4: 发放成功后的落库方式
 * PRD 20.4.2: 幂等与重复发放保护
 * 扩展: 支持线下到访来源
 */
export const approveTask = async (
  taskId: string,
  input: ApproveTaskInput,
  adminUserId: string
): Promise<GrantTaskResponse> => {
  const task = await prisma.tokenGrantTask.findUnique({
    where: { id: taskId },
    include: {
      meeting: { select: { id: true, topic: true } },
      guest: { select: { id: true, name: true, guestCategory: true } },
      onsiteVisit: { select: { id: true, name: true, organization: true, guestCategory: true } },
      inviter: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      'Token 发放任务不存在'
    );
  }

  // PRD 20.4.2: 幂等保护
  if (task.status === 'APPROVED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该任务已审核通过，不能重复发放'
    );
  }

  if (task.status === 'REJECTED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该任务已被拒绝'
    );
  }

  const finalAmount = input.amountOverride ?? task.defaultAmount.toNumber();

  // 检查接收者账户
  const inviterAccount = await prisma.tokenAccount.findUnique({
    where: { userId: task.inviterUserId },
  });

  if (!inviterAccount) {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '接收者 Token 账户不存在'
    );
  }

  // 根据任务来源确定奖励原因
  const isMeetingGuest = task.taskSource === 'MEETING_GUEST';
  const guestName = isMeetingGuest ? task.guest?.name : task.onsiteVisit?.name;
  const guestOrg = isMeetingGuest ? '' : ` (${task.onsiteVisit?.organization})`;
  const reason = isMeetingGuest
    ? `座谈会邀请奖励：${task.meeting?.topic} - 嘉宾 ${guestName}`
    : `线下到访邀请奖励：${guestName}${guestOrg}`;

  // 事务：更新任务状态 + 创建交易 + 更新余额 + 更新嘉宾/到访记录
  const result = await prisma.$transaction(async (tx) => {
    // 创建 Token 交易
    const transaction = await tx.tokenTransaction.create({
      data: {
        toUserId: task.inviterUserId,
        amount: new Decimal(finalAmount),
        direction: 'MEETING_INVITE_REWARD',
        status: 'COMPLETED',
        reason,
        adminUserId,
        relatedMeetingId: task.meetingId,
        relatedGuestId: task.guestId,
        completedAt: new Date(),
      },
    });

    // 更新接收者余额
    await tx.tokenAccount.update({
      where: { userId: task.inviterUserId },
      data: {
        balance: {
          increment: finalAmount,
        },
      },
    });

    // 更新任务状态
    const updatedTask = await tx.tokenGrantTask.update({
      where: { id: taskId },
      data: {
        status: 'APPROVED',
        finalAmount: new Decimal(finalAmount),
        adminUserId,
        adminComment: input.comment,
        decidedAt: new Date(),
        tokenTransactionId: transaction.id,
      },
      include: taskInclude,
    });

    // 根据来源更新嘉宾/到访记录的最终发放金额
    if (isMeetingGuest && task.guestId) {
      await tx.externalGuest.update({
        where: { id: task.guestId },
        data: { finalGrantAmount: new Decimal(finalAmount) },
      });
    } else if (task.onsiteVisitId) {
      await tx.onsiteVisit.update({
        where: { id: task.onsiteVisitId },
        data: { finalGrantAmount: new Decimal(finalAmount) },
      });
    }

    return updatedTask;
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'TOKEN_GRANT_APPROVED',
    objectType: 'TOKEN_GRANT_TASK',
    objectId: task.id,
    summary: `审核通过 Token 发放: ${finalAmount} → ${task.inviter.name}`,
    metadata: { 
      taskSource: task.taskSource,
      guestId: task.guestId, 
      onsiteVisitId: task.onsiteVisitId,
      amount: finalAmount,
    },
  });

  // PRD 20.5: 通知要求 - 发放成功通知
  const notificationTitle = isMeetingGuest ? '座谈会邀请奖励发放成功' : '线下到访邀请奖励发放成功';
  const notificationContent = isMeetingGuest
    ? `您因邀请嘉宾"${guestName}"参加座谈会"${task.meeting?.topic}"获得 ${finalAmount} Token 奖励`
    : `您因邀请"${guestName}"线下到访获得 ${finalAmount} Token 奖励`;

  await sendNotification({
    eventType: 'TOKEN_GRANT_APPROVED',
    actorUserId: adminUserId,
    targetUserIds: [task.inviterUserId],
    relatedObjectType: 'TOKEN_GRANT_TASK',
    relatedObjectId: task.id,
    title: notificationTitle,
    content: notificationContent,
  });

  // 已批准的任务不需要检查历史记录
  return formatGrantTaskResponseSync(result);
};

/**
 * 拒绝发放任务
 * 扩展: 支持线下到访来源
 */
export const rejectTask = async (
  taskId: string,
  input: RejectTaskInput,
  adminUserId: string
): Promise<GrantTaskResponse> => {
  const task = await prisma.tokenGrantTask.findUnique({
    where: { id: taskId },
    include: {
      meeting: { select: { id: true, topic: true } },
      guest: { select: { id: true, name: true } },
      onsiteVisit: { select: { id: true, name: true, organization: true } },
      inviter: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      'Token 发放任务不存在'
    );
  }

  if (task.status !== 'PENDING') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '只能拒绝待审核的任务'
    );
  }

  const updated = await prisma.tokenGrantTask.update({
    where: { id: taskId },
    data: {
      status: 'REJECTED',
      adminUserId,
      adminComment: input.comment,
      decidedAt: new Date(),
    },
    include: taskInclude,
  });

  // 根据任务来源确定通知内容
  const isMeetingGuest = task.taskSource === 'MEETING_GUEST';
  const guestName = isMeetingGuest ? task.guest?.name : task.onsiteVisit?.name;

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'TOKEN_GRANT_REJECTED',
    objectType: 'TOKEN_GRANT_TASK',
    objectId: task.id,
    summary: `拒绝 Token 发放: ${task.inviter.name}`,
    metadata: { 
      taskSource: task.taskSource,
      guestId: task.guestId, 
      onsiteVisitId: task.onsiteVisitId,
      reason: input.comment,
    },
  });

  // PRD 20.5: 拒绝也要通知
  const notificationTitle = isMeetingGuest ? '座谈会邀请奖励发放被拒绝' : '线下到访邀请奖励发放被拒绝';
  const notificationContent = isMeetingGuest
    ? `您为嘉宾"${guestName}"申请的座谈会邀请奖励已被拒绝${input.comment ? `，原因: ${input.comment}` : ''}`
    : `您为"${guestName}"申请的线下到访邀请奖励已被拒绝${input.comment ? `，原因: ${input.comment}` : ''}`;

  await sendNotification({
    eventType: 'TOKEN_GRANT_REJECTED',
    actorUserId: adminUserId,
    targetUserIds: [task.inviterUserId],
    relatedObjectType: 'TOKEN_GRANT_TASK',
    relatedObjectId: task.id,
    title: notificationTitle,
    content: notificationContent,
  });

  // 已拒绝的任务不需要检查历史记录
  return formatGrantTaskResponseSync(updated);
};

/**
 * 获取发放任务统计（仅管理员）
 */
export const getGrantTaskStats = async (): Promise<GrantTaskStatsResponse> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingCount, approvedCount, rejectedCount, totalGranted, thisMonthGranted] =
    await Promise.all([
      prisma.tokenGrantTask.count({ where: { status: 'PENDING' } }),
      prisma.tokenGrantTask.count({ where: { status: 'APPROVED' } }),
      prisma.tokenGrantTask.count({ where: { status: 'REJECTED' } }),
      prisma.tokenGrantTask.aggregate({
        where: { status: 'APPROVED' },
        _sum: { finalAmount: true },
      }),
      prisma.tokenGrantTask.aggregate({
        where: {
          status: 'APPROVED',
          decidedAt: { gte: monthStart },
        },
        _sum: { finalAmount: true },
      }),
    ]);

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    totalGrantedAmount: totalGranted._sum.finalAmount?.toNumber() ?? 0,
    thisMonthGrantedAmount: thisMonthGranted._sum.finalAmount?.toNumber() ?? 0,
  };
};

/**
 * 获取我的发放任务（作为邀请人）
 */
export const getMyGrantTasks = async (
  userId: string,
  status?: string,
  taskSource?: TaskSource
): Promise<GrantTaskResponse[]> => {
  const where: Record<string, unknown> = {
    inviterUserId: userId,
  };

  if (status) {
    where.status = status;
  }

  if (taskSource) {
    where.taskSource = taskSource;
  }

  const tasks = await prisma.tokenGrantTask.findMany({
    where,
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });

  // 用户查看自己的任务不需要历史记录检查
  return tasks.map((t) => formatGrantTaskResponseSync(t));
};

// ================================
// 辅助函数
// ================================

/**
 * 检查嘉宾历史访问记录
 * 返回警告信息：是否同一人来过、同一组织有人来过
 */
async function checkGuestHistory(
  guestName: string,
  organization: string,
  currentTaskId: string
): Promise<GuestHistoryWarning[]> {
  const warnings: GuestHistoryWarning[] = [];

  // 检查同一个人是否来过（通过姓名+组织匹配）
  const [samePersonTasks, sameOrgTasks] = await Promise.all([
    // 同一个人（姓名+组织完全匹配）
    prisma.tokenGrantTask.findMany({
      where: {
        id: { not: currentTaskId },
        status: 'APPROVED',
        OR: [
          { guest: { name: guestName, organization } },
          { onsiteVisit: { name: guestName, organization } },
        ],
      },
      orderBy: { decidedAt: 'desc' },
      take: 1,
      select: { id: true, decidedAt: true },
    }),
    // 同一组织（组织匹配但姓名不同）
    prisma.tokenGrantTask.findMany({
      where: {
        id: { not: currentTaskId },
        status: 'APPROVED',
        OR: [
          { guest: { organization, NOT: { name: guestName } } },
          { onsiteVisit: { organization, NOT: { name: guestName } } },
        ],
      },
      select: { id: true, decidedAt: true },
    }),
  ]);

  if (samePersonTasks.length > 0) {
    warnings.push({
      type: 'SAME_PERSON',
      message: `此人曾经来访过`,
      count: samePersonTasks.length,
      lastVisitDate: samePersonTasks[0].decidedAt ?? undefined,
    });
  }

  if (sameOrgTasks.length > 0) {
    warnings.push({
      type: 'SAME_ORG',
      message: `该组织「${organization}」已有 ${sameOrgTasks.length} 人来访过`,
      count: sameOrgTasks.length,
    });
  }

  return warnings;
}

function formatGrantTaskResponseSync(task: {
  id: string;
  taskSource: string;
  meeting: {
    id: string;
    topic: string;
    startTime: Date;
    endTime: Date;
    venue: { id: string; name: string } | null;
  } | null;
  guest: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
  } | null;
  onsiteVisit: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
    visitDate: Date;
    venue: { id: string; name: string } | null;
  } | null;
  inviter: {
    id: string;
    name: string;
    avatar: string | null;
  };
  adminUser: {
    id: string;
    name: string;
  } | null;
  status: string;
  defaultAmount: Decimal;
  finalAmount: Decimal | null;
  adminComment: string | null;
  decidedAt: Date | null;
  tokenTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}, historyWarnings?: GuestHistoryWarning[]): GrantTaskResponse {
  return {
    id: task.id,
    taskSource: task.taskSource as TaskSource,
    meeting: task.meeting,
    guest: task.guest,
    onsiteVisit: task.onsiteVisit,
    inviter: task.inviter,
    status: task.status as GrantTaskResponse['status'],
    defaultAmount: task.defaultAmount.toNumber(),
    finalAmount: task.finalAmount?.toNumber() ?? null,
    admin: task.adminUser,
    adminComment: task.adminComment,
    decidedAt: task.decidedAt,
    tokenTransactionId: task.tokenTransactionId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    historyWarnings,
  };
}

// 包装函数：带历史记录检查（仅用于待审核任务）
async function formatGrantTaskResponse(task: Parameters<typeof formatGrantTaskResponseSync>[0]): Promise<GrantTaskResponse> {
  // 只对待审核任务检查历史记录
  if (task.status === 'PENDING') {
    const guestName = task.guest?.name || task.onsiteVisit?.name || '';
    const organization = task.guest?.organization || task.onsiteVisit?.organization || '';
    
    if (guestName && organization) {
      const warnings = await checkGuestHistory(guestName, organization, task.id);
      return formatGrantTaskResponseSync(task, warnings.length > 0 ? warnings : undefined);
    }
  }
  
  return formatGrantTaskResponseSync(task);
}

