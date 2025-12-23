/**
 * 响应服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 13: 响应模块
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { 
  NotFoundError, 
  ForbiddenError,
  BadRequestError,
  ErrorCodes 
} from '../../utils/errors.js';
import { getRoleLevelValue } from '../../utils/visibility.js';
import { notDeleted } from '../../utils/softDelete.js';
import { 
  parsePaginationParams, 
  buildPaginatedResult,
  type PaginatedResult 
} from '../../utils/pagination.js';
import { parseSortToPrisma } from '../../utils/sorting.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { ResponseStatus, ProjectEventType, DemandStatus, RoleLevel } from '@prisma/client';
import type {
  CreateResponseDto,
  ReviewResponseDto,
  ConfirmUsageDto,
  ModifyOrAbandonDto,
  ListResponsesQueryDto,
  ResponseListItem,
  ResponseDetail,
} from './response.dto.js';

/**
 * 构建激励摘要
 */
const buildRewardSummary = (share?: number | null, token?: number | null, other?: string | null): string => {
  const parts: string[] = [];
  if (share) parts.push(`股份${share}%`);
  if (token) parts.push(`Token ${token}`);
  if (other) parts.push(other);
  return parts.join(' + ') || '待定';
};

/**
 * 创建响应 (PRD 6.3.6)
 */
export const createResponse = async (
  dto: CreateResponseDto,
  responderId: string
): Promise<ResponseDetail> => {
  const {
    demandId,
    content,
    intendedSharePercentage,
    intendedTokenAmount,
    intendedOther,
    note,
    networkResourceIds,
  } = dto;

  // 验证需求存在且开放
  const demand = await prisma.demand.findFirst({
    where: { id: demandId, ...notDeleted },
    include: {
      project: { select: { id: true, name: true, reviewStatus: true } },
    },
  });

  if (!demand) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '需求不存在');
  }

  if (demand.status !== DemandStatus.OPEN) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '需求已关闭，无法响应');
  }

  // 检查是否已响应过
  const existingResponse = await prisma.demandResponse.findFirst({
    where: {
      demandId,
      responderId,
      isDeleted: false,
      status: { not: ResponseStatus.REJECTED },
    },
  });

  if (existingResponse) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '您已响应过此需求');
  }

  // 创建响应
  const response = await prisma.$transaction(async (tx) => {
    const newResponse = await tx.demandResponse.create({
      data: {
        demandId,
        responderId,
        content,
        intendedSharePercentage,
        intendedTokenAmount,
        intendedOther,
        note,
        status: ResponseStatus.SUBMITTED,
      },
    });

    // 关联人脉资源
    if (networkResourceIds && networkResourceIds.length > 0) {
      for (const resourceId of networkResourceIds) {
        await tx.responseNetworkLink.create({
          data: {
            responseId: newResponse.id,
            networkResourceId: resourceId,
          },
        });
      }
    }

    // 创建项目事件
    await tx.projectEvent.create({
      data: {
        projectId: demand.projectId,
        eventType: ProjectEventType.DEMAND_RESPONDED,
        title: `需求「${demand.name}」收到新响应`,
        payload: {
          demandId,
          responseId: newResponse.id,
          responderId,
        },
        createdById: responderId,
      },
    });

    return newResponse;
  });

  await createAuditLog({
    userId: responderId,
    action: 'CREATE',
    objectType: 'RESPONSE',
    objectId: response.id,
    summary: `响应需求：${demand.name}`,
    metadata: { demandId, projectId: demand.projectId },
  });

  logger.info({ responseId: response.id, demandId, responderId }, '响应创建成功');

  return getResponseById(response.id, responderId, 'FOUNDER', true);
};

/**
 * 获取响应列表
 */
export const listResponses = async (
  query: ListResponsesQueryDto,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<PaginatedResult<ResponseListItem>> => {
  const { demandId, projectId, responderId, status, search } = query;
  const pagination = parsePaginationParams(query);
  const orderBy = parseSortToPrisma(query.sort || '-createdAt');

  const where: any = {
    ...notDeleted,
  };

  if (demandId) where.demandId = demandId;
  if (projectId) where.demand = { projectId };
  if (responderId) where.responderId = responderId;
  if (status) where.status = status;
  if (search) {
    where.content = { contains: search, mode: 'insensitive' };
  }

  // 可见性：响应者本人、需求负责人、项目负责人、管理员
  if (!isAdmin) {
    where.OR = [
      { responderId: currentUserId },
      { demand: { owners: { some: { userId: currentUserId } } } },
      { demand: { project: { members: { some: { userId: currentUserId, role: 'LEADER' } } } } },
    ];
  }

  const [responses, total] = await prisma.$transaction([
    prisma.demandResponse.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        demand: {
          select: { 
            id: true, 
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
        responder: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.demandResponse.count({ where }),
  ]);

  const items: ResponseListItem[] = responses.map((r) => ({
    id: r.id,
    demandId: r.demandId,
    demandName: r.demand.name,
    projectId: r.demand.project.id,
    projectName: r.demand.project.name,
    responder: r.responder,
    status: r.status,
    intendedRewardSummary: buildRewardSummary(
      r.intendedSharePercentage ? Number(r.intendedSharePercentage) : null,
      r.intendedTokenAmount ? Number(r.intendedTokenAmount) : null,
      r.intendedOther
    ),
    finalRewardSummary: r.status === ResponseStatus.ACCEPTED_PENDING_USAGE || 
      r.status === ResponseStatus.USED ||
      r.status === ResponseStatus.MODIFIED
      ? buildRewardSummary(
          r.finalSharePercentage ? Number(r.finalSharePercentage) : null,
          r.finalTokenAmount ? Number(r.finalTokenAmount) : null,
          r.finalOther
        )
      : null,
    createdAt: r.createdAt,
  }));

  return buildPaginatedResult(items, pagination.page, pagination.pageSize, total);
};

/**
 * 获取响应详情
 */
export const getResponseById = async (
  responseId: string,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        select: { 
          id: true, 
          name: true,
          project: { 
            select: { 
              id: true, 
              name: true,
              members: { 
                where: { role: 'LEADER' }, 
                select: { userId: true } 
              },
            } 
          },
          owners: { select: { userId: true } },
        },
      },
      responder: {
        select: { id: true, name: true, avatar: true },
      },
      networkLinks: {
        include: {
          networkResource: {
            select: { id: true, name: true, organization: true },
          },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  // 检查权限：管理员、响应者、需求负责人、项目负责人
  const isProjectLeader = response.demand.project?.members?.some(
    (m) => m.userId === currentUserId
  );
  const canView = 
    isAdmin ||
    response.responderId === currentUserId ||
    response.demand.owners.some((o) => o.userId === currentUserId) ||
    isProjectLeader;

  if (!canView) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此响应');
  }

  return {
    id: response.id,
    demandId: response.demandId,
    demandName: response.demand.name,
    projectId: response.demand.project.id,
    projectName: response.demand.project.name,
    responder: response.responder,
    status: response.status,
    content: response.content,
    // 添加权限相关信息供前端使用
    demandOwnerIds: response.demand.owners.map((o) => o.userId),
    projectLeaderIds: response.demand.project.members?.map((m) => m.userId) || [],
    intendedSharePercentage: response.intendedSharePercentage 
      ? Number(response.intendedSharePercentage) 
      : null,
    intendedTokenAmount: response.intendedTokenAmount 
      ? Number(response.intendedTokenAmount) 
      : null,
    intendedOther: response.intendedOther,
    finalSharePercentage: response.finalSharePercentage 
      ? Number(response.finalSharePercentage) 
      : null,
    finalTokenAmount: response.finalTokenAmount 
      ? Number(response.finalTokenAmount) 
      : null,
    finalOther: response.finalOther,
    rejectReason: response.rejectReason,
    modifyReason: response.modifyReason,
    note: response.note,
    intendedRewardSummary: buildRewardSummary(
      response.intendedSharePercentage ? Number(response.intendedSharePercentage) : null,
      response.intendedTokenAmount ? Number(response.intendedTokenAmount) : null,
      response.intendedOther
    ),
    finalRewardSummary: response.status === ResponseStatus.ACCEPTED_PENDING_USAGE || 
      response.status === ResponseStatus.USED ||
      response.status === ResponseStatus.MODIFIED
      ? buildRewardSummary(
          response.finalSharePercentage ? Number(response.finalSharePercentage) : null,
          response.finalTokenAmount ? Number(response.finalTokenAmount) : null,
          response.finalOther
        )
      : null,
    networkResources: response.networkLinks.map((l) => ({
      id: l.networkResource.id,
      name: l.networkResource.name,
      organization: l.networkResource.organization,
    })),
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
};

/**
 * 审核响应 (PRD 6.3.6.4)
 */
export const reviewResponse = async (
  responseId: string,
  dto: ReviewResponseDto,
  reviewerId: string,
  isAdmin: boolean
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        include: {
          owners: { select: { userId: true, isOwner: true } },
          project: { 
            select: { 
              id: true, 
              name: true,
              members: { where: { role: 'LEADER' }, select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  if (response.status !== ResponseStatus.SUBMITTED) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '响应状态不允许审核');
  }

  // 检查权限：需求 owner 或项目负责人或管理员
  const isOwner = response.demand.owners.some((o) => o.userId === reviewerId && o.isOwner);
  const isLeader = response.demand.project.members.some((m) => m.userId === reviewerId);
  if (!isOwner && !isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有需求管理人、项目负责人或管理员可以审核响应');
  }

  const {
    action,
    finalSharePercentage,
    finalTokenAmount,
    finalOther,
    rejectReason,
  } = dto;

  await prisma.$transaction(async (tx) => {
    const newStatus = action === 'accept' 
      ? ResponseStatus.ACCEPTED_PENDING_USAGE 
      : ResponseStatus.REJECTED;

    await tx.demandResponse.update({
      where: { id: responseId },
      data: {
        status: newStatus,
        finalSharePercentage: action === 'accept' ? finalSharePercentage : undefined,
        finalTokenAmount: action === 'accept' ? finalTokenAmount : undefined,
        finalOther: action === 'accept' ? finalOther : undefined,
        rejectReason: action === 'reject' ? rejectReason : undefined,
      },
    });

    // 创建项目事件
    await tx.projectEvent.create({
      data: {
        projectId: response.demand.projectId,
        eventType: action === 'accept' 
          ? ProjectEventType.DEMAND_ACCEPTED 
          : ProjectEventType.DEMAND_RESPONSE_REJECTED,
        title: action === 'accept' 
          ? `响应已接受（待使用）` 
          : `响应已拒绝`,
        description: action === 'reject' ? rejectReason : undefined,
        payload: {
          responseId,
          demandId: response.demandId,
          responderId: response.responderId,
        },
        createdById: reviewerId,
      },
    });

    // 接受响应后，如果响应人非项目成员，自动加入项目
    if (action === 'accept') {
      const isMember = await tx.projectMember.findFirst({
        where: {
          projectId: response.demand.projectId,
          userId: response.responderId,
          isDeleted: false,
        },
      });

      if (!isMember) {
        await tx.projectMember.create({
          data: {
            projectId: response.demand.projectId,
            userId: response.responderId,
            role: 'MEMBER',
          },
        });

        await tx.projectEvent.create({
          data: {
            projectId: response.demand.projectId,
            eventType: ProjectEventType.PROJECT_MEMBER_JOINED,
            title: `响应人自动加入项目成员`,
            payload: { userId: response.responderId, reason: '响应被接受' },
            createdById: reviewerId,
          },
        });
      }
    }
  });

  await createAuditLog({
    userId: reviewerId,
    action: action === 'accept' ? 'ACCEPT' : 'REJECT',
    objectType: 'RESPONSE',
    objectId: responseId,
    summary: `${action === 'accept' ? '接受' : '拒绝'}响应`,
    metadata: { rejectReason },
  });

  logger.info({ responseId, reviewerId, action }, '响应审核完成');

  return getResponseById(responseId, reviewerId, 'FOUNDER', isAdmin);
};

/**
 * 确认资源已使用
 */
export const confirmUsage = async (
  responseId: string,
  dto: ConfirmUsageDto,
  userId: string,
  isAdmin: boolean
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        include: {
          owners: { select: { userId: true, isOwner: true } },
          project: { 
            select: { 
              id: true,
              reviewStatus: true,
              businessStatus: true,
              members: { where: { role: 'LEADER' }, select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  if (response.status !== ResponseStatus.ACCEPTED_PENDING_USAGE && response.status !== ResponseStatus.MODIFIED) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '只能确认「已接受待使用」或「条款已修改」状态的响应');
  }

  // 检查项目是否已审核通过
  if (response.demand.project.reviewStatus !== 'APPROVED') {
    throw new BadRequestError(
      ErrorCodes.VALIDATION_ERROR, 
      '项目待审核期间不能确认资源使用（涉及Token操作）'
    );
  }

  // PRD: 废弃项目禁止 Token 操作
  if (response.demand.project.businessStatus === 'ABANDONED') {
    throw new BadRequestError(
      ErrorCodes.VALIDATION_ERROR, 
      '废弃项目不能确认资源使用'
    );
  }

  // 检查权限
  const isLeader = response.demand.project.members.some((m) => m.userId === userId);
  const isOwner = response.demand.owners.some((o) => o.userId === userId && o.isOwner);
  if (!isLeader && !isOwner && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人、需求管理人或管理员可以确认资源使用');
  }

  await prisma.$transaction(async (tx) => {
    await tx.demandResponse.update({
      where: { id: responseId },
      data: { status: ResponseStatus.USED },
    });

    await tx.projectEvent.create({
      data: {
        projectId: response.demand.projectId,
        eventType: ProjectEventType.RESOURCE_USED,
        title: `资源已使用确认`,
        description: dto.note,
        payload: { responseId, demandId: response.demandId },
        createdById: userId,
      },
    });

    // 自动转账：如果有最终 Token 激励，直接转给资源方（无需管理员审核）
    const finalTokenAmount = response.finalTokenAmount 
      ? Number(response.finalTokenAmount) 
      : 0;
    
    if (finalTokenAmount > 0) {
      // 查找项目创建者作为付款方（或使用当前操作人）
      const payerUserId = userId;

      // 检查付款方余额
      const payerAccount = await tx.tokenAccount.findUnique({
        where: { userId: payerUserId },
      });
      
      if (payerAccount && Number(payerAccount.balance) >= finalTokenAmount) {
        // 扣减付款方余额
        await tx.tokenAccount.update({
          where: { userId: payerUserId },
          data: { balance: { decrement: finalTokenAmount } },
        });

        // 增加收款方余额
        const responderAccount = await tx.tokenAccount.findUnique({
          where: { userId: response.responderId },
        });
        
        if (responderAccount) {
          await tx.tokenAccount.update({
            where: { userId: response.responderId },
            data: { balance: { increment: finalTokenAmount } },
          });
        } else {
          // 创建新账户
          await tx.tokenAccount.create({
            data: {
              userId: response.responderId,
              balance: finalTokenAmount,
            },
          });
        }

        // 创建交易记录（直接完成，无需审核）
        await tx.tokenTransaction.create({
          data: {
            fromUserId: payerUserId,
            toUserId: response.responderId,
            amount: finalTokenAmount,
            type: 'TRANSFER',
            status: 'COMPLETED',
            reason: `需求响应结算：${response.demand.name}`,
            relatedProjectId: response.demand.projectId,
            reviewedByUserId: userId, // 操作人自动审核
            reviewedAt: new Date(),
          },
        });

        logger.info(
          { responseId, fromUserId: payerUserId, toUserId: response.responderId, amount: finalTokenAmount },
          '需求响应结算 Token 已自动转账'
        );
      } else {
        logger.warn(
          { responseId, payerUserId, requiredAmount: finalTokenAmount, balance: payerAccount?.balance },
          '需求响应结算 Token 转账失败：余额不足'
        );
      }
    }
  });

  logger.info({ responseId, userId }, '资源使用确认成功');

  return getResponseById(responseId, userId, 'FOUNDER', isAdmin);
};

/**
 * 发起修改/废弃申请 (PRD 6.3.6.5)
 * 流程：负责人发起 → 资源方确认 → 若资源方拒绝则管理员裁决
 */
export const initiateModifyOrAbandon = async (
  responseId: string,
  dto: ModifyOrAbandonDto,
  userId: string,
  isAdmin: boolean
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        include: {
          project: { 
            select: { 
              id: true,
              members: { where: { role: 'LEADER' }, select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  // 只有已接受待使用或条款已修改的响应才能修改/废弃
  if (response.status !== ResponseStatus.ACCEPTED_PENDING_USAGE && response.status !== ResponseStatus.MODIFIED) {
    throw new BadRequestError(
      ErrorCodes.VALIDATION_ERROR, 
      '只能对「已接受待使用」或「条款已修改」状态的响应发起修改/废弃申请'
    );
  }

  // 检查权限：项目负责人或管理员
  const isLeader = response.demand.project.members.some((m) => m.userId === userId);
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以发起修改/废弃申请');
  }

  // 设置为待资源方确认状态
  const newStatus = dto.action === 'modify' 
    ? ResponseStatus.PENDING_MODIFY_CONFIRM 
    : ResponseStatus.PENDING_ABANDON_CONFIRM;

  await prisma.$transaction(async (tx) => {
    await tx.demandResponse.update({
      where: { id: responseId },
      data: {
        status: newStatus,
        pendingAction: dto.action.toUpperCase(),
        pendingReason: dto.reason,
        pendingNewSharePct: dto.action === 'modify' ? dto.newSharePercentage : undefined,
        pendingNewTokenAmt: dto.action === 'modify' ? dto.newTokenAmount : undefined,
        pendingNewOther: dto.action === 'modify' ? dto.newOther : undefined,
        pendingInitiatedBy: userId,
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: response.demand.projectId,
        eventType: dto.action === 'modify' 
          ? ProjectEventType.RESPONSE_MODIFY_REQUESTED 
          : ProjectEventType.RESPONSE_ABANDON_REQUESTED,
        title: dto.action === 'modify' 
          ? `发起响应条款修改申请（待资源方确认）` 
          : `发起响应废弃申请（待资源方确认）`,
        description: dto.reason,
        payload: { 
          responseId, 
          demandId: response.demandId,
          action: dto.action,
          newReward: dto.action === 'modify' ? {
            sharePercentage: dto.newSharePercentage,
            tokenAmount: dto.newTokenAmount,
            other: dto.newOther,
          } : undefined,
        },
        createdById: userId,
      },
    });
  });

  await createAuditLog({
    userId,
    action: dto.action === 'modify' ? 'REQUEST_MODIFY' : 'REQUEST_ABANDON',
    objectType: 'RESPONSE',
    objectId: responseId,
    summary: `发起${dto.action === 'modify' ? '修改' : '废弃'}响应申请`,
    metadata: { reason: dto.reason },
  });

  // 发送通知给资源方（响应人）
  const actionText = dto.action === 'modify' ? '条款修改' : '废弃响应';
  await sendNotification({
    eventType: dto.action === 'modify' ? 'RESPONSE_MODIFY_REQUESTED' : 'RESPONSE_ABANDON_REQUESTED',
    actorUserId: userId,
    targetUserIds: [response.responderId],
    relatedObjectType: 'RESPONSE',
    relatedObjectId: responseId,
    title: `响应${actionText}申请待您确认`,
    content: `需求方发起了${actionText}申请，请及时查看并确认。原因：${dto.reason}`,
  });

  logger.info({ responseId, userId, action: dto.action }, '发起修改/废弃响应申请');

  return getResponseById(responseId, userId, 'FOUNDER', isAdmin);
};

/**
 * 资源方确认修改/废弃申请 (PRD 6.3.6.5)
 */
export const confirmModifyOrAbandon = async (
  responseId: string,
  decision: 'accept' | 'reject',
  comment: string | undefined,
  userId: string
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        include: {
          project: { select: { id: true } },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  // 检查状态
  if (
    response.status !== ResponseStatus.PENDING_MODIFY_CONFIRM &&
    response.status !== ResponseStatus.PENDING_ABANDON_CONFIRM
  ) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '响应不在待确认状态');
  }

  // 只有响应人（资源方）可以确认
  if (response.responderId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有资源方（响应人）可以确认');
  }

  const isModify = response.status === ResponseStatus.PENDING_MODIFY_CONFIRM;

  await prisma.$transaction(async (tx) => {
    if (decision === 'accept') {
      // 资源方接受
      const newStatus = isModify ? ResponseStatus.MODIFIED : ResponseStatus.ABANDONED;
      await tx.demandResponse.update({
        where: { id: responseId },
        data: {
          status: newStatus,
          modifyReason: response.pendingReason,
          finalSharePercentage: isModify ? response.pendingNewSharePct : undefined,
          finalTokenAmount: isModify ? response.pendingNewTokenAmt : undefined,
          finalOther: isModify ? response.pendingNewOther : undefined,
          // 清除待处理信息
          pendingAction: null,
          pendingReason: null,
          pendingNewSharePct: null,
          pendingNewTokenAmt: null,
          pendingNewOther: null,
          pendingInitiatedBy: null,
        },
      });

      await tx.projectEvent.create({
        data: {
          projectId: response.demand.projectId,
          eventType: ProjectEventType.RESPONSE_CONFIRM_ACCEPTED,
          title: isModify ? `资源方接受条款修改` : `资源方接受废弃响应`,
          description: comment,
          payload: { responseId, decision: 'accept' },
          createdById: userId,
        },
      });
    } else {
      // 资源方拒绝 → 转管理员裁决
      await tx.demandResponse.update({
        where: { id: responseId },
        data: {
          status: ResponseStatus.PENDING_ADMIN_ARBITRATION,
        },
      });

      await tx.projectEvent.create({
        data: {
          projectId: response.demand.projectId,
          eventType: ProjectEventType.RESPONSE_CONFIRM_REJECTED,
          title: `资源方拒绝${isModify ? '条款修改' : '废弃响应'}，转管理员裁决`,
          description: comment,
          payload: { responseId, decision: 'reject' },
          createdById: userId,
        },
      });
    }
  });

  // 获取发起人（需求方）ID
  const initiatorId = response.pendingInitiatedBy;

  // 通知需求方（发起人）资源方的决定
  if (initiatorId) {
    const actionText = isModify ? '条款修改' : '废弃响应';
    const resultText = decision === 'accept' ? '已接受' : '已拒绝，转管理员裁决';
    await sendNotification({
      eventType: decision === 'accept' ? 'RESPONSE_CONFIRM_ACCEPTED' : 'RESPONSE_CONFIRM_REJECTED',
      actorUserId: userId,
      targetUserIds: [initiatorId],
      relatedObjectType: 'RESPONSE',
      relatedObjectId: responseId,
      title: `${actionText}申请${resultText}`,
      content: decision === 'accept' 
        ? `资源方已接受您发起的${actionText}申请${comment ? `，备注：${comment}` : ''}`
        : `资源方拒绝了您发起的${actionText}申请，已转交管理员裁决${comment ? `，拒绝理由：${comment}` : ''}`,
    });
  }

  logger.info({ responseId, userId, decision }, '资源方确认修改/废弃申请');

  return getResponseById(responseId, userId, 'FOUNDER', false);
};

/**
 * 管理员裁决 (PRD 6.3.6.5)
 */
export const adminArbitrate = async (
  responseId: string,
  decision: 'approve_modify' | 'approve_abandon' | 'continue_original',
  comment: string | undefined,
  newReward: {
    sharePercentage?: number;
    tokenAmount?: number;
    other?: string;
  } | undefined,
  adminId: string
): Promise<ResponseDetail> => {
  const response = await prisma.demandResponse.findFirst({
    where: { id: responseId, ...notDeleted },
    include: {
      demand: {
        include: {
          project: { select: { id: true } },
        },
      },
    },
  });

  if (!response) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '响应不存在');
  }

  if (response.status !== ResponseStatus.PENDING_ADMIN_ARBITRATION) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '响应不在待裁决状态');
  }

  await prisma.$transaction(async (tx) => {
    let newStatus: ResponseStatus;
    let title: string;

    switch (decision) {
      case 'approve_modify':
        newStatus = ResponseStatus.MODIFIED;
        title = '管理员裁决：批准修改条款';
        break;
      case 'approve_abandon':
        newStatus = ResponseStatus.ABANDONED;
        title = '管理员裁决：批准废弃响应';
        break;
      case 'continue_original':
        newStatus = ResponseStatus.ACCEPTED_PENDING_USAGE;
        title = '管理员裁决：继续执行原条款';
        break;
    }

    await tx.demandResponse.update({
      where: { id: responseId },
      data: {
        status: newStatus,
        arbitrationDecision: decision,
        arbitrationComment: comment,
        arbitratedBy: adminId,
        arbitratedAt: new Date(),
        // 如果批准修改，更新激励条款
        finalSharePercentage: decision === 'approve_modify' && newReward?.sharePercentage 
          ? newReward.sharePercentage 
          : (decision === 'approve_modify' ? response.pendingNewSharePct : undefined),
        finalTokenAmount: decision === 'approve_modify' && newReward?.tokenAmount 
          ? newReward.tokenAmount 
          : (decision === 'approve_modify' ? response.pendingNewTokenAmt : undefined),
        finalOther: decision === 'approve_modify' && newReward?.other 
          ? newReward.other 
          : (decision === 'approve_modify' ? response.pendingNewOther : undefined),
        modifyReason: decision !== 'continue_original' ? response.pendingReason : undefined,
        // 清除待处理信息
        pendingAction: null,
        pendingReason: null,
        pendingNewSharePct: null,
        pendingNewTokenAmt: null,
        pendingNewOther: null,
        pendingInitiatedBy: null,
      },
    });

    await tx.projectEvent.create({
      data: {
        projectId: response.demand.projectId,
        eventType: ProjectEventType.RESPONSE_ADMIN_ARBITRATED,
        title,
        description: comment,
        payload: { responseId, decision, newReward },
        createdById: adminId,
      },
    });
  });

  await createAuditLog({
    userId: adminId,
    action: 'ARBITRATE',
    objectType: 'RESPONSE',
    objectId: responseId,
    summary: `管理员裁决响应：${decision}`,
    metadata: { decision, comment },
  });

  // 通知双方（需求方发起人和资源方）
  const decisionText = {
    approve_modify: '批准修改条款',
    approve_abandon: '批准废弃响应',
    continue_original: '继续执行原条款',
  }[decision];
  
  const targetUserIds = [response.responderId];
  if (response.pendingInitiatedBy) {
    targetUserIds.push(response.pendingInitiatedBy);
  }
  
  await sendNotification({
    eventType: 'RESPONSE_ADMIN_ARBITRATED',
    actorUserId: adminId,
    targetUserIds,
    relatedObjectType: 'RESPONSE',
    relatedObjectId: responseId,
    title: `管理员裁决：${decisionText}`,
    content: `管理员已对响应争议做出裁决：${decisionText}${comment ? `。裁决说明：${comment}` : ''}`,
  });

  logger.info({ responseId, adminId, decision }, '管理员裁决完成');

  return getResponseById(responseId, adminId, 'FOUNDER', true);
};

/**
 * 获取我的响应
 */
export const getMyResponses = async (
  userId: string
): Promise<ResponseListItem[]> => {
  const responses = await prisma.demandResponse.findMany({
    where: {
      responderId: userId,
      ...notDeleted,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      demand: {
        select: { 
          id: true, 
          name: true,
          project: { select: { id: true, name: true } },
        },
      },
      responder: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  return responses.map((r) => ({
    id: r.id,
    demandId: r.demandId,
    demandName: r.demand.name,
    projectId: r.demand.project.id,
    projectName: r.demand.project.name,
    responder: r.responder,
    status: r.status,
    intendedRewardSummary: buildRewardSummary(
      r.intendedSharePercentage ? Number(r.intendedSharePercentage) : null,
      r.intendedTokenAmount ? Number(r.intendedTokenAmount) : null,
      r.intendedOther
    ),
    finalRewardSummary: r.status === ResponseStatus.ACCEPTED_PENDING_USAGE || 
      r.status === ResponseStatus.USED ||
      r.status === ResponseStatus.MODIFIED
      ? buildRewardSummary(
          r.finalSharePercentage ? Number(r.finalSharePercentage) : null,
          r.finalTokenAmount ? Number(r.finalTokenAmount) : null,
          r.finalOther
        )
      : null,
    createdAt: r.createdAt,
  }));
};

