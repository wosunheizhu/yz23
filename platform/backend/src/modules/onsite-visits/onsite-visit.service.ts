/**
 * 线下到访记录 Service
 * 用户直接记录邀请到公司线下的人员，独立于座谈会
 * 创建记录后自动生成Token发放任务供管理员审批
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/db.js';
import { BusinessError, ERROR_CODES } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  CreateOnsiteVisitInput,
  UpdateOnsiteVisitInput,
  ListOnsiteVisitsQuery,
  OnsiteVisitResponse,
  OnsiteVisitListResponse,
  OnsiteVisitStatsResponse,
  GuestCategory,
} from './onsite-visit.dto.js';
import { GUEST_CATEGORY_DEFAULT_AMOUNT } from './onsite-visit.dto.js';

// ================================
// 辅助函数
// ================================

const notDeleted = { isDeleted: false };

/**
 * 格式化线下到访记录响应
 */
function formatOnsiteVisitResponse(visit: any): OnsiteVisitResponse {
  return {
    id: visit.id,
    name: visit.name,
    organization: visit.organization,
    title: visit.title,
    contact: visit.contact,
    purpose: visit.purpose,
    note: visit.note,
    visitDate: visit.visitDate.toISOString(),
    guestCategory: visit.guestCategory as GuestCategory,
    defaultGrantAmount: visit.defaultGrantAmount.toNumber(),
    finalGrantAmount: visit.finalGrantAmount?.toNumber() ?? null,
    inviter: {
      id: visit.invitedBy.id,
      name: visit.invitedBy.name,
      avatar: visit.invitedBy.avatar,
    },
    venue: visit.venue
      ? {
          id: visit.venue.id,
          name: visit.venue.name,
        }
      : null,
    grantTask: visit.grantTask
      ? {
          id: visit.grantTask.id,
          status: visit.grantTask.status,
          finalAmount: visit.grantTask.finalAmount?.toNumber() ?? null,
        }
      : null,
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
  };
}

// ================================
// CRUD 操作
// ================================

/**
 * 创建线下到访记录
 * 同时自动创建Token发放任务
 */
export const createOnsiteVisit = async (
  input: CreateOnsiteVisitInput,
  inviterUserId: string
): Promise<OnsiteVisitResponse> => {
  // 计算默认发放金额
  const defaultAmount = GUEST_CATEGORY_DEFAULT_AMOUNT[input.guestCategory as GuestCategory] || 0;

  // 如果提供了场地，验证存在
  if (input.venueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: input.venueId },
    });
    if (!venue) {
      throw new BusinessError(
        ERROR_CODES.RESOURCE_NOT_FOUND.code,
        '场地不存在'
      );
    }
  }

  // 事务：创建到访记录 + 创建Token发放任务
  const result = await prisma.$transaction(async (tx) => {
    // 创建到访记录
    const visit = await tx.onsiteVisit.create({
      data: {
        name: input.name,
        organization: input.organization,
        title: input.title,
        contact: input.contact,
        purpose: input.purpose,
        note: input.note,
        visitDate: input.visitDate,
        guestCategory: input.guestCategory,
        defaultGrantAmount: new Decimal(defaultAmount),
        invitedByUserId: inviterUserId,
        venueId: input.venueId,
      },
      include: {
        invitedBy: { select: { id: true, name: true, avatar: true } },
        venue: { select: { id: true, name: true } },
        grantTask: true,
      },
    });

    // 创建Token发放任务（如果有默认金额）
    if (defaultAmount > 0) {
      await tx.tokenGrantTask.create({
        data: {
          taskSource: 'ONSITE_VISIT',
          onsiteVisitId: visit.id,
          inviterUserId: inviterUserId,
          defaultAmount: new Decimal(defaultAmount),
          status: 'PENDING',
        },
      });
    }

    // 重新查询以包含grantTask
    const visitWithTask = await tx.onsiteVisit.findUnique({
      where: { id: visit.id },
      include: {
        invitedBy: { select: { id: true, name: true, avatar: true } },
        venue: { select: { id: true, name: true } },
        grantTask: { select: { id: true, status: true, finalAmount: true } },
      },
    });

    return visitWithTask!;
  });

  // 审计日志
  await createAuditLog({
    userId: inviterUserId,
    action: 'ONSITE_VISIT_CREATED',
    objectType: 'ONSITE_VISIT',
    objectId: result.id,
    summary: `创建线下到访记录: ${input.name} (${input.organization})`,
    metadata: { guestCategory: input.guestCategory, defaultAmount },
  });

  // 通知管理员有新的Token发放任务
  if (defaultAmount > 0) {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true, isDeleted: false },
      select: { id: true },
    });

    if (admins.length > 0) {
      await sendNotification({
        eventType: 'ONSITE_VISIT_TOKEN_TASK_CREATED',
        actorUserId: inviterUserId,
        targetUserIds: admins.map((a) => a.id),
        relatedObjectType: 'ONSITE_VISIT',
        relatedObjectId: result.id,
        title: '新的线下到访Token发放任务',
        content: `${result.invitedBy.name}记录了线下到访: ${input.name}(${input.organization})，待审核发放${defaultAmount} Token`,
      });
    }
  }

  return formatOnsiteVisitResponse(result);
};

/**
 * 获取线下到访记录详情
 */
export const getOnsiteVisitById = async (
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<OnsiteVisitResponse> => {
  const visit = await prisma.onsiteVisit.findFirst({
    where: { id, ...notDeleted },
    include: {
      invitedBy: { select: { id: true, name: true, avatar: true } },
      venue: { select: { id: true, name: true } },
      grantTask: { select: { id: true, status: true, finalAmount: true } },
    },
  });

  if (!visit) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '线下到访记录不存在'
    );
  }

  // 只有管理员或创建者可以查看敏感联系方式
  const canViewContact = isAdmin || visit.invitedByUserId === userId;
  const result = formatOnsiteVisitResponse(visit);
  
  if (!canViewContact) {
    result.contact = null;
  }

  return result;
};

/**
 * 更新线下到访记录
 */
export const updateOnsiteVisit = async (
  id: string,
  input: UpdateOnsiteVisitInput,
  userId: string,
  isAdmin: boolean
): Promise<OnsiteVisitResponse> => {
  const visit = await prisma.onsiteVisit.findFirst({
    where: { id, ...notDeleted },
    include: { grantTask: true },
  });

  if (!visit) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '线下到访记录不存在'
    );
  }

  // 只有管理员或创建者可以更新
  if (!isAdmin && visit.invitedByUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '无权限更新此记录'
    );
  }

  // 如果Token发放任务已审核通过，不能修改
  if (visit.grantTask && visit.grantTask.status === 'APPROVED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      'Token已发放，不能修改记录'
    );
  }

  // 如果修改了嘉宾分类，更新默认发放金额
  let newDefaultAmount: Decimal | undefined;
  if (input.guestCategory && input.guestCategory !== visit.guestCategory) {
    newDefaultAmount = new Decimal(GUEST_CATEGORY_DEFAULT_AMOUNT[input.guestCategory as GuestCategory] || 0);
  }

  const updated = await prisma.onsiteVisit.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.organization && { organization: input.organization }),
      ...(input.title && { title: input.title }),
      ...(input.contact !== undefined && { contact: input.contact }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.visitDate && { visitDate: input.visitDate }),
      ...(input.guestCategory && { guestCategory: input.guestCategory }),
      ...(newDefaultAmount && { defaultGrantAmount: newDefaultAmount }),
      ...(input.venueId !== undefined && { venueId: input.venueId }),
    },
    include: {
      invitedBy: { select: { id: true, name: true, avatar: true } },
      venue: { select: { id: true, name: true } },
      grantTask: { select: { id: true, status: true, finalAmount: true } },
    },
  });

  // 如果修改了默认金额，同步更新发放任务
  if (newDefaultAmount && visit.grantTask && visit.grantTask.status === 'PENDING') {
    await prisma.tokenGrantTask.update({
      where: { id: visit.grantTask.id },
      data: { defaultAmount: newDefaultAmount },
    });
  }

  // 审计日志
  await createAuditLog({
    userId,
    action: 'ONSITE_VISIT_UPDATED',
    objectType: 'ONSITE_VISIT',
    objectId: id,
    summary: `更新线下到访记录: ${updated.name}`,
    metadata: input,
  });

  return formatOnsiteVisitResponse(updated);
};

/**
 * 删除线下到访记录（软删除）
 */
export const deleteOnsiteVisit = async (
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const visit = await prisma.onsiteVisit.findFirst({
    where: { id, ...notDeleted },
    include: { grantTask: true },
  });

  if (!visit) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '线下到访记录不存在'
    );
  }

  // 只有管理员或创建者可以删除
  if (!isAdmin && visit.invitedByUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '无权限删除此记录'
    );
  }

  // 如果Token发放任务已审核通过，不能删除
  if (visit.grantTask && visit.grantTask.status === 'APPROVED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      'Token已发放，不能删除记录'
    );
  }

  await prisma.$transaction(async (tx) => {
    // 删除关联的发放任务（如果是待审核状态）
    if (visit.grantTask && visit.grantTask.status === 'PENDING') {
      await tx.tokenGrantTask.delete({
        where: { id: visit.grantTask.id },
      });
    }

    // 软删除到访记录
    await tx.onsiteVisit.update({
      where: { id },
      data: { isDeleted: true },
    });
  });

  // 审计日志
  await createAuditLog({
    userId,
    action: 'ONSITE_VISIT_DELETED',
    objectType: 'ONSITE_VISIT',
    objectId: id,
    summary: `删除线下到访记录: ${visit.name}`,
  });
};

/**
 * 查询线下到访记录列表
 */
export const listOnsiteVisits = async (
  query: ListOnsiteVisitsQuery,
  userId: string,
  isAdmin: boolean
): Promise<OnsiteVisitListResponse> => {
  const {
    search,
    guestCategory,
    inviterId,
    fromDate,
    toDate,
    hasGrantTask,
    page,
    pageSize,
  } = query;

  const where: Prisma.OnsiteVisitWhereInput = {
    ...notDeleted,
    // 非管理员只能看到自己的记录
    ...(!isAdmin && { invitedByUserId: userId }),
    ...(guestCategory && { guestCategory }),
    ...(inviterId && { invitedByUserId: inviterId }),
    ...(fromDate && { visitDate: { gte: new Date(fromDate) } }),
    ...(toDate && { visitDate: { lte: new Date(toDate) } }),
    ...(hasGrantTask === 'true' && { grantTask: { isNot: null } }),
    ...(hasGrantTask === 'false' && { grantTask: null }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.onsiteVisit.findMany({
      where,
      include: {
        invitedBy: { select: { id: true, name: true, avatar: true } },
        venue: { select: { id: true, name: true } },
        grantTask: { select: { id: true, status: true, finalAmount: true } },
      },
      orderBy: { visitDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.onsiteVisit.count({ where }),
  ]);

  return {
    data: items.map((item) => {
      const result = formatOnsiteVisitResponse(item);
      // 非管理员且非创建者不能看到联系方式
      if (!isAdmin && item.invitedByUserId !== userId) {
        result.contact = null;
      }
      return result;
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取我的线下到访记录
 */
export const getMyOnsiteVisits = async (
  userId: string
): Promise<OnsiteVisitResponse[]> => {
  const visits = await prisma.onsiteVisit.findMany({
    where: {
      invitedByUserId: userId,
      ...notDeleted,
    },
    include: {
      invitedBy: { select: { id: true, name: true, avatar: true } },
      venue: { select: { id: true, name: true } },
      grantTask: { select: { id: true, status: true, finalAmount: true } },
    },
    orderBy: { visitDate: 'desc' },
  });

  return visits.map(formatOnsiteVisitResponse);
};

/**
 * 获取线下到访统计
 */
export const getOnsiteVisitStats = async (
  userId?: string
): Promise<OnsiteVisitStatsResponse> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: Prisma.OnsiteVisitWhereInput = {
    ...notDeleted,
    ...(userId && { invitedByUserId: userId }),
  };

  const [
    totalVisits,
    pendingGrants,
    approvedGrants,
    totalGrantedResult,
    thisMonthVisits,
  ] = await Promise.all([
    prisma.onsiteVisit.count({ where }),
    prisma.tokenGrantTask.count({
      where: {
        taskSource: 'ONSITE_VISIT',
        status: 'PENDING',
        ...(userId && { inviterUserId: userId }),
      },
    }),
    prisma.tokenGrantTask.count({
      where: {
        taskSource: 'ONSITE_VISIT',
        status: 'APPROVED',
        ...(userId && { inviterUserId: userId }),
      },
    }),
    prisma.tokenGrantTask.aggregate({
      where: {
        taskSource: 'ONSITE_VISIT',
        status: 'APPROVED',
        ...(userId && { inviterUserId: userId }),
      },
      _sum: { finalAmount: true },
    }),
    prisma.onsiteVisit.count({
      where: {
        ...where,
        visitDate: { gte: monthStart },
      },
    }),
  ]);

  return {
    totalVisits,
    pendingGrants,
    approvedGrants,
    totalGrantedAmount: totalGrantedResult._sum.finalAmount?.toNumber() ?? 0,
    thisMonthVisits,
  };
};

