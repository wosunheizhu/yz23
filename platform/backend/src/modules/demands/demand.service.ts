/**
 * 需求服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 12: 需求模块
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
import { DemandStatus, DemandType, ProjectEventType, RoleLevel } from '@prisma/client';
import type {
  CreateDemandDto,
  UpdateDemandDto,
  CloseDemandDto,
  CancelDemandDto,
  ListDemandsQueryDto,
  DemandListItem,
  DemandDetail,
} from './demand.dto.js';

/**
 * 创建需求 (PRD 6.3.5)
 */
export const createDemand = async (
  dto: CreateDemandDto,
  creatorId: string
): Promise<DemandDetail> => {
  const {
    projectId,
    name,
    businessType,
    description,
    industry,
    demandType,
    targetProfile,
    ownerIds,
    primaryOwnerId,
    rewardSharePercentage,
    rewardTokenAmount,
    rewardOther,
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds,
    note,
    networkResourceIds,
  } = dto;

  // 验证项目存在（如果关联了项目）
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...notDeleted },
    });

    if (!project) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
    }
  }

  // 使用事务创建需求
  const demand = await prisma.$transaction(async (tx) => {
    // 1. 创建需求
    const newDemand = await tx.demand.create({
      data: {
        projectId: projectId || null,
        name,
        businessType,
        description,
        industry,
        demandType: demandType as DemandType,
        targetProfile: targetProfile ? JSON.parse(JSON.stringify(targetProfile)) : null,
        rewardSharePercentage,
        rewardTokenAmount,
        rewardOther,
        visibilityScopeType,
        visibilityMinRoleLevel,
        visibilityUserIds: visibilityUserIds || [],
        note,
      },
    });

    // 2. 创建需求负责人
    for (const ownerId of ownerIds) {
      await tx.demandOwner.create({
        data: {
          demandId: newDemand.id,
          userId: ownerId,
          isOwner: ownerId === primaryOwnerId,
        },
      });
    }

    // 3. 关联人脉资源
    if (networkResourceIds && networkResourceIds.length > 0) {
      for (const resourceId of networkResourceIds) {
        await tx.demandNetworkLink.create({
          data: {
            demandId: newDemand.id,
            networkResourceId: resourceId,
          },
        });
      }
    }

    // 4. 创建项目事件（仅当关联了项目时）
    if (projectId) {
      await tx.projectEvent.create({
        data: {
          projectId,
          eventType: ProjectEventType.DEMAND_PUBLISHED,
          title: `发布新需求「${name}」`,
          description: `类型：${demandType === 'NETWORK' ? '人脉需求' : '普通需求'}`,
          payload: {
            demandId: newDemand.id,
            demandType,
            industry,
          },
          createdById: creatorId,
        },
      });
    }

    return newDemand;
  });

  // 记录审计日志
  await createAuditLog({
    userId: creatorId,
    action: 'CREATE',
    objectType: 'DEMAND',
    objectId: demand.id,
    summary: `创建需求：${name}`,
    metadata: { projectId, demandType },
  });

  logger.info({ demandId: demand.id, creatorId, projectId }, '需求创建成功');

  return getDemandById(demand.id, creatorId, 'FOUNDER', true);
};

/**
 * 获取需求列表
 */
export const listDemands = async (
  query: ListDemandsQueryDto,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<PaginatedResult<DemandListItem>> => {
  const { 
    projectId,
    demandType,
    status,
    businessType,
    industry,
    ownerId,
    search,
  } = query;
  const pagination = parsePaginationParams(query);
  const orderBy = parseSortToPrisma(query.sort || '-createdAt');

  // 构建查询条件
  const where: any = {
    ...notDeleted,
  };

  // 可见性过滤
  if (!isAdmin) {
    where.OR = [
      { visibilityScopeType: 'ALL' },
      { 
        visibilityScopeType: 'ROLE_MIN_LEVEL',
        visibilityMinRoleLevel: { lte: getRoleLevelValue(currentRoleLevel as RoleLevel) },
      },
      {
        visibilityScopeType: 'CUSTOM',
        visibilityUserIds: { has: currentUserId },
      },
    ];
  }

  // 筛选条件
  if (projectId) where.projectId = projectId;
  if (demandType) where.demandType = demandType;
  if (status) where.status = status;
  if (businessType) where.businessType = businessType;
  if (industry) where.industry = industry;
  if (ownerId) {
    where.owners = { some: { userId: ownerId } };
  }

  // 搜索
  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  // 查询
  const [demands, total] = await prisma.$transaction([
    prisma.demand.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        project: {
          select: { id: true, name: true },
        },
        owners: {
          where: { isOwner: true },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { responses: true },
        },
      },
    }),
    prisma.demand.count({ where }),
  ]);

  const items: DemandListItem[] = demands.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    projectName: d.project?.name || null,
    name: d.name,
    demandType: d.demandType,
    businessType: d.businessType,
    industry: d.industry,
    status: d.status,
    rewardSummary: buildRewardSummary(d),
    responsesCount: d._count.responses,
    primaryOwner: d.owners[0]?.user || { id: '', name: '未知' },
    createdAt: d.createdAt,
  }));

  return buildPaginatedResult(items, pagination.page, pagination.pageSize, total);
};

/**
 * 构建激励摘要
 */
const buildRewardSummary = (demand: any): string => {
  const parts: string[] = [];
  if (demand.rewardSharePercentage) {
    parts.push(`股份${demand.rewardSharePercentage}%`);
  }
  if (demand.rewardTokenAmount) {
    parts.push(`Token ${demand.rewardTokenAmount}`);
  }
  if (demand.rewardOther) {
    parts.push(demand.rewardOther);
  }
  return parts.join(' + ') || '待定';
};

/**
 * 获取需求详情
 */
export const getDemandById = async (
  demandId: string,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<DemandDetail> => {
  const demand = await prisma.demand.findFirst({
    where: { id: demandId, ...notDeleted },
    include: {
      project: {
        select: { id: true, name: true },
      },
      owners: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      responses: {
        where: { isDeleted: false },
        include: {
          responder: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
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

  if (!demand) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '需求不存在');
  }

  // 检查可见性
  if (!isAdmin) {
    const canView = checkDemandVisibility(
      demand,
      currentUserId,
      getRoleLevelValue(currentRoleLevel as RoleLevel)
    );
    if (!canView) {
      throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此需求');
    }
  }

  const primaryOwner = demand.owners.find((o) => o.isOwner);

  return {
    id: demand.id,
    projectId: demand.projectId,
    projectName: demand.project?.name || null,
    name: demand.name,
    demandType: demand.demandType,
    businessType: demand.businessType,
    industry: demand.industry,
    status: demand.status,
    description: demand.description,
    targetProfile: demand.targetProfile,
    rewardSharePercentage: demand.rewardSharePercentage ? Number(demand.rewardSharePercentage) : null,
    rewardTokenAmount: demand.rewardTokenAmount ? Number(demand.rewardTokenAmount) : null,
    rewardOther: demand.rewardOther,
    note: demand.note,
    rewardSummary: buildRewardSummary(demand),
    responsesCount: demand.responses.length,
    primaryOwner: primaryOwner?.user || { id: '', name: '未知' },
    createdAt: demand.createdAt,
    owners: demand.owners.map((o) => ({
      id: o.user.id,
      name: o.user.name,
      isOwner: o.isOwner,
    })),
    networkResources: demand.networkLinks.map((l) => ({
      id: l.networkResource.id,
      name: l.networkResource.name,
      organization: l.networkResource.organization,
    })),
    responses: demand.responses.map((r) => ({
      id: r.id,
      responderName: r.responder.name,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
};

/**
 * 检查需求可见性
 */
const checkDemandVisibility = (
  demand: any,
  userId: string,
  userRoleLevel: number
): boolean => {
  // 需求负责人始终可见
  if (demand.owners.some((o: any) => o.userId === userId)) {
    return true;
  }

  switch (demand.visibilityScopeType) {
    case 'ALL':
      return true;
    case 'ROLE_MIN_LEVEL':
      return userRoleLevel >= (demand.visibilityMinRoleLevel || 1);
    case 'CUSTOM':
      return demand.visibilityUserIds?.includes(userId) || userRoleLevel >= 3;
    default:
      return false;
  }
};

/**
 * 更新需求
 */
export const updateDemand = async (
  demandId: string,
  dto: UpdateDemandDto,
  userId: string,
  isAdmin: boolean
): Promise<DemandDetail> => {
  const demand = await prisma.demand.findFirst({
    where: { id: demandId, ...notDeleted },
    include: {
      owners: { where: { isOwner: true } },
    },
  });

  if (!demand) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '需求不存在');
  }

  // 检查权限：需求 owner 或管理员
  const isOwner = demand.owners.some((o) => o.userId === userId);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有需求管理人或管理员可以编辑需求');
  }

  await prisma.$transaction(async (tx) => {
    await tx.demand.update({
      where: { id: demandId },
      data: {
        ...dto,
        targetProfile: dto.targetProfile 
          ? JSON.parse(JSON.stringify(dto.targetProfile)) 
          : undefined,
      },
    });

    // 创建项目事件
    await tx.projectEvent.create({
      data: {
        projectId: demand.projectId,
        eventType: ProjectEventType.DEMAND_UPDATED,
        title: `更新需求「${demand.name}」`,
        payload: { demandId, changes: dto },
        createdById: userId,
      },
    });
  });

  logger.info({ demandId, userId }, '需求更新成功');

  return getDemandById(demandId, userId, 'FOUNDER', isAdmin);
};

/**
 * 关闭需求
 */
export const closeDemand = async (
  demandId: string,
  dto: CloseDemandDto,
  userId: string,
  isAdmin: boolean
): Promise<DemandDetail> => {
  const demand = await prisma.demand.findFirst({
    where: { id: demandId, ...notDeleted },
    include: {
      owners: { where: { isOwner: true } },
    },
  });

  if (!demand) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '需求不存在');
  }

  if (demand.status === DemandStatus.CLOSED) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '需求已关闭');
  }

  // 检查权限
  const isOwner = demand.owners.some((o) => o.userId === userId);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有需求管理人或管理员可以关闭需求');
  }

  await prisma.$transaction(async (tx) => {
    await tx.demand.update({
      where: { id: demandId },
      data: { status: DemandStatus.CLOSED },
    });

    await tx.projectEvent.create({
      data: {
        projectId: demand.projectId,
        eventType: ProjectEventType.DEMAND_CLOSED,
        title: `关闭需求「${demand.name}」`,
        description: dto.reason,
        payload: { demandId, reason: dto.reason },
        createdById: userId,
      },
    });
  });

  await createAuditLog({
    userId,
    action: 'CLOSE',
    objectType: 'DEMAND',
    objectId: demandId,
    summary: `关闭需求：${demand.name}`,
    metadata: { reason: dto.reason },
  });

  logger.info({ demandId, userId }, '需求关闭成功');

  return getDemandById(demandId, userId, 'FOUNDER', isAdmin);
};

/**
 * 取消需求（提前终止）
 */
export const cancelDemand = async (
  demandId: string,
  dto: CancelDemandDto,
  userId: string,
  isAdmin: boolean
): Promise<DemandDetail> => {
  const demand = await prisma.demand.findFirst({
    where: { id: demandId, ...notDeleted },
    include: {
      owners: { where: { isOwner: true } },
    },
  });

  if (!demand) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '需求不存在');
  }

  if (demand.status !== DemandStatus.OPEN) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '只能取消开放中的需求');
  }

  // 检查权限
  const isOwner = demand.owners.some((o) => o.userId === userId);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有需求管理人或管理员可以取消需求');
  }

  await prisma.$transaction(async (tx) => {
    await tx.demand.update({
      where: { id: demandId },
      data: { status: DemandStatus.CANCELLED },
    });

    await tx.projectEvent.create({
      data: {
        projectId: demand.projectId,
        eventType: ProjectEventType.DEMAND_CANCELLED,
        title: `取消需求「${demand.name}」`,
        description: dto.reason,
        payload: { demandId, reason: dto.reason },
        createdById: userId,
      },
    });
  });

  await createAuditLog({
    userId,
    action: 'CANCEL',
    objectType: 'DEMAND',
    objectId: demandId,
    summary: `取消需求：${demand.name}`,
    metadata: { reason: dto.reason },
  });

  logger.info({ demandId, userId }, '需求取消成功');

  return getDemandById(demandId, userId, 'FOUNDER', isAdmin);
};

/**
 * 获取项目的所有需求
 */
export const getDemandsByProject = async (
  projectId: string,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<DemandListItem[]> => {
  const where: any = {
    projectId,
    ...notDeleted,
  };

  // 可见性过滤
  if (!isAdmin) {
    where.OR = [
      { visibilityScopeType: 'ALL' },
      { 
        visibilityScopeType: 'ROLE_MIN_LEVEL',
        visibilityMinRoleLevel: { lte: getRoleLevelValue(currentRoleLevel as RoleLevel) },
      },
      {
        visibilityScopeType: 'CUSTOM',
        visibilityUserIds: { has: currentUserId },
      },
      {
        owners: { some: { userId: currentUserId } },
      },
    ];
  }

  const demands = await prisma.demand.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true } },
      owners: {
        where: { isOwner: true },
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { responses: true } },
    },
  });

  return demands.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    projectName: d.project?.name || null,
    name: d.name,
    demandType: d.demandType,
    businessType: d.businessType,
    industry: d.industry,
    status: d.status,
    rewardSummary: buildRewardSummary(d),
    responsesCount: d._count.responses,
    primaryOwner: d.owners[0]?.user || { id: '', name: '未知' },
    createdAt: d.createdAt,
  }));
};

