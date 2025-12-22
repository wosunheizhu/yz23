/**
 * 项目服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 11: 项目管理模块
 * PRD 6.3: 项目管理详细需求
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { 
  NotFoundError, 
  ForbiddenError,
  BadRequestError,
  ErrorCodes 
} from '../../utils/errors.js';
import { buildVisibilityFilter, getRoleLevelValue } from '../../utils/visibility.js';
import { notDeleted } from '../../utils/softDelete.js';
import { 
  parsePaginationParams, 
  buildPaginatedResult,
  type PaginatedResult 
} from '../../utils/pagination.js';
import { parseSortToPrisma } from '../../utils/sorting.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { fetchNewsForProject } from '../../jobs/news-processor.js';
import { ProjectReviewStatus, ProjectBusinessStatus, ProjectEventType, RoleLevel } from '@prisma/client';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  ReviewProjectDto,
  JoinProjectDto,
  ReviewJoinRequestDto,
  ListProjectsQueryDto,
  ProjectListItem,
  ProjectDetail,
  ProjectStats,
} from './project.dto.js';

/**
 * 创建项目事件
 * @param tx - 可选的事务客户端，如果提供则在事务内创建
 */
const createProjectEvent = async (
  projectId: string,
  eventType: ProjectEventType,
  title: string,
  description?: string,
  payload?: Record<string, unknown>,
  createdById?: string,
  tx?: any // 事务客户端
) => {
  const client = tx || prisma;
  return client.projectEvent.create({
    data: {
      projectId,
      eventType,
      title,
      description,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      createdById,
    },
  });
};

/**
 * 通知项目所有成员
 * 用于项目时间线事件通知
 */
const notifyProjectMembers = async (
  projectId: string,
  projectName: string,
  memberIds: string[],
  eventType: string,
  title: string,
  content: string,
  actorId?: string
): Promise<void> => {
  // 过滤掉操作者自己（不需要通知自己）
  const targetUserIds = actorId 
    ? memberIds.filter(id => id !== actorId)
    : memberIds;
  
  if (targetUserIds.length === 0) {
    return;
  }
  
  await sendNotification({
    eventType: eventType as any,
    targetUserIds,
    actorId,
    relatedObjectType: 'Project',
    relatedObjectId: projectId,
    title,
    content,
    channels: ['INBOX'],
  });
  
  logger.info({
    projectId,
    projectName,
    targetUserCount: targetUserIds.length,
    eventType,
  }, '已通知项目成员');
};

/**
 * 创建项目 (PRD 6.3.3)
 * 只有联合创始人可发起，管理员可代发
 */
export const createProject = async (
  dto: CreateProjectDto,
  creatorId: string,
  creatorRoleLevel: string,
  isAdmin: boolean
): Promise<ProjectDetail> => {
  // 验证权限：只有联合创始人或管理员可发起
  if (creatorRoleLevel !== 'FOUNDER' && !isAdmin) {
    throw new ForbiddenError(
      ErrorCodes.FORBIDDEN,
      '只有联合创始人可以发起项目（管理员可代发）'
    );
  }

  const {
    name,
    businessType,
    industry,
    region,
    description,
    linkedProjectIds,
    leaders,
    members = [],
    shares,
    businessStatus,
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds,
    initialDemand,
    networkResourceIds,
  } = dto;

  // 使用事务创建项目及关联数据
  const project = await prisma.$transaction(async (tx) => {
    // 1. 创建项目
    const newProject = await tx.project.create({
      data: {
        name,
        businessType,
        industry,
        region,
        description,
        reviewStatus: ProjectReviewStatus.PENDING_REVIEW,
        businessStatus: businessStatus as ProjectBusinessStatus,
        visibilityScopeType,
        visibilityMinRoleLevel,
        visibilityUserIds: visibilityUserIds || [],
        createdById: creatorId,
      },
    });

    // 2. 创建项目成员（负责人）
    for (const leaderId of leaders) {
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: leaderId,
          role: 'LEADER',
        },
      });
    }

    // 3. 创建项目成员（普通成员）
    for (const memberId of members) {
      if (!leaders.includes(memberId)) {
        await tx.projectMember.create({
          data: {
            projectId: newProject.id,
            userId: memberId,
            role: 'MEMBER',
          },
        });
      }
    }

    // 4. 创建股权结构
    for (const share of shares) {
      await tx.projectShare.create({
        data: {
          projectId: newProject.id,
          holderName: share.holderName,
          holderId: share.holderId,
          percentage: share.percentage,
          note: share.note,
        },
      });
    }

    // 5. 创建项目关联
    if (linkedProjectIds && linkedProjectIds.length > 0) {
      for (const linkedId of linkedProjectIds) {
        await tx.projectLink.create({
          data: {
            fromProjectId: newProject.id,
            toProjectId: linkedId,
            description: dto.linkDescription,
          },
        });
      }
    }

    // 6. 关联人脉资源（v3新增）
    if (networkResourceIds && networkResourceIds.length > 0) {
      for (const resourceId of networkResourceIds) {
        await tx.projectNetworkLink.create({
          data: {
            projectId: newProject.id,
            networkResourceId: resourceId,
          },
        });
      }
    }

    // 7. 创建首个需求（如果有）
    if (initialDemand) {
      await tx.demand.create({
        data: {
          projectId: newProject.id,
          name: initialDemand.name,
          businessType,
          description: initialDemand.description,
          visibilityScopeType,
          visibilityMinRoleLevel,
          visibilityUserIds: visibilityUserIds || [],
          owners: {
            create: {
              userId: creatorId,
              isOwner: true,
            },
          },
        },
      });
    }

    // 8. 创建项目事件：PROJECT_CREATED（在事务内）
    const leaderNames = leaders.join('、') || '无';
    const sharesDesc = shares.map(s => `${s.holderName}(${s.percentage}%)`).join('、');
    await createProjectEvent(
      newProject.id,
      ProjectEventType.PROJECT_CREATED,
      `项目创建成功`,
      [
        `[项目] 项目名称：${name}`,
        `[类型] 业务类型：${businessType}`,
        industry ? `[行业] 所属行业：${industry}` : null,
        region ? `[地区] 所在地区：${region}` : null,
        `[团队] 项目负责人：${leaderNames}`,
        `[股权] 股权结构：${sharesDesc}`,
        `[状态] 状态：待审核`,
      ].filter(Boolean).join('\n'),
      {
        businessType,
        industry,
        region,
        leaders,
        shares,
      },
      creatorId,
      tx  // 传入事务客户端
    );

    return newProject;
  });

  // 记录审计日志
  await createAuditLog({
    userId: creatorId,
    action: 'CREATE',
    objectType: 'PROJECT',
    objectId: project.id,
    summary: `创建项目：${name}`,
    metadata: { businessType, leaders },
  });

  logger.info({ projectId: project.id, creatorId }, '项目创建成功');

  // 异步为新项目抓取相关新闻（不阻塞项目创建）
  fetchNewsForProject(project.id).then(result => {
    logger.info({ projectId: project.id, ...result }, '新项目相关新闻抓取完成');
  }).catch(err => {
    logger.error({ projectId: project.id, error: err }, '新项目新闻抓取失败');
  });

  return getProjectById(project.id, creatorId, creatorRoleLevel, isAdmin);
};

/**
 * 获取项目列表
 */
export const listProjects = async (
  query: ListProjectsQueryDto,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<PaginatedResult<ProjectListItem>> => {
  const { 
    search, 
    businessType, 
    reviewStatus, 
    businessStatus,
    industry,
    region,
    createdById,
    myProjects,
    leadOnly,
  } = query;
  const pagination = parsePaginationParams(query);
  const orderBy = parseSortToPrisma(query.sort || '-createdAt');

  // 构建查询条件
  const where: any = {
    ...notDeleted,
  };

  // 可见性过滤（非管理员需要过滤）
  if (!isAdmin) {
    const visibilityFilter = buildVisibilityFilter(
      currentUserId,
      getRoleLevelValue(currentRoleLevel as RoleLevel)
    );
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

  // 搜索
  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  // 筛选条件
  if (businessType) where.businessType = businessType;
  if (reviewStatus) where.reviewStatus = reviewStatus;
  if (businessStatus) where.businessStatus = businessStatus;
  if (industry) where.industry = industry;
  if (region) where.region = region;
  if (createdById) where.createdById = createdById;

  // 仅我参与的项目（成员或负责人）
  if (myProjects) {
    where.members = {
      some: {
        userId: currentUserId,
        isDeleted: false,
      },
    };
  }

  // 仅我领导的项目
  if (leadOnly) {
    where.members = {
      some: {
        userId: currentUserId,
        role: 'LEADER',
        isDeleted: false,
      },
    };
  }

  // 查询
  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        members: {
          where: { isDeleted: false },
          select: { role: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const items: ProjectListItem[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    businessType: p.businessType,
    industry: p.industry,
    region: p.region,
    reviewStatus: p.reviewStatus,
    businessStatus: p.businessStatus,
    createdBy: p.createdBy,
    leadersCount: p.members.filter((m) => m.role === 'LEADER').length,
    membersCount: p.members.length,
    createdAt: p.createdAt,
  }));

  return buildPaginatedResult(items, pagination.page, pagination.pageSize, total);
};

/**
 * 获取项目详情
 */
export const getProjectById = async (
  projectId: string,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<ProjectDetail> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      createdBy: {
        select: { id: true, name: true, avatar: true },
      },
      members: {
        where: { isDeleted: false },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      },
      shares: {
        orderBy: { percentage: 'desc' },
      },
      linkedProjects: {
        include: {
          toProject: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: {
          demands: true,
          events: true,
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查可见性权限
  if (!isAdmin) {
    const canView = checkProjectVisibility(
      project,
      currentUserId,
      getRoleLevelValue(currentRoleLevel as RoleLevel)
    );
    if (!canView) {
      throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此项目');
    }
  }

  return {
    id: project.id,
    name: project.name,
    businessType: project.businessType,
    industry: project.industry,
    region: project.region,
    reviewStatus: project.reviewStatus,
    businessStatus: project.businessStatus,
    description: project.description,
    createdBy: project.createdBy,
    leadersCount: project.members.filter((m) => m.role === 'LEADER').length,
    membersCount: project.members.length,
    createdAt: project.createdAt,
    leaders: project.members
      .filter((m) => m.role === 'LEADER')
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
    members: project.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
      avatar: m.user.avatar,
      joinedAt: m.joinedAt,
    })),
    shares: project.shares.map((s) => ({
      holderName: s.holderName,
      holderId: s.holderId,
      percentage: Number(s.percentage),
      note: s.note,
    })),
    linkedProjects: project.linkedProjects.map((l) => ({
      id: l.toProject.id,
      name: l.toProject.name,
      description: l.description,
    })),
    demandsCount: project._count.demands,
    eventsCount: project._count.events,
  };
};

/**
 * 检查项目可见性
 */
const checkProjectVisibility = (
  project: any,
  userId: string,
  userRoleLevel: number
): boolean => {
  switch (project.visibilityScopeType) {
    case 'ALL':
      return true;
    case 'ROLE_MIN_LEVEL':
      return userRoleLevel >= (project.visibilityMinRoleLevel || 1);
    case 'CUSTOM':
      return project.visibilityUserIds?.includes(userId) || userRoleLevel >= 3;
    default:
      return false;
  }
};

/**
 * 审核项目（管理员）(PRD 6.3.3.2)
 */
export const reviewProject = async (
  projectId: string,
  dto: ReviewProjectDto,
  adminId: string
): Promise<ProjectDetail> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  if (project.reviewStatus !== ProjectReviewStatus.PENDING_REVIEW) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '项目已审核，不能重复操作');
  }

  const newStatus = dto.action === 'approve' 
    ? ProjectReviewStatus.APPROVED 
    : ProjectReviewStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    // 更新项目状态
    await tx.project.update({
      where: { id: projectId },
      data: { reviewStatus: newStatus },
    });

    // 创建项目事件
    const eventDesc = dto.action === 'approve'
      ? [
          `[通过] 项目审核通过！`,
          `[时间] 审核时间：${new Date().toLocaleDateString('zh-CN')}`,
          dto.reason ? `[意见] 审核意见：${dto.reason}` : null,
          `[状态] 项目现已进入「进行中」状态`,
        ].filter(Boolean).join('\n')
      : [
          `[驳回] 项目审核未通过`,
          `[时间] 审核时间：${new Date().toLocaleDateString('zh-CN')}`,
          `[原因] 驳回原因：${dto.reason || '未说明'}`,
          `[提示] 请根据反馈修改后重新提交`,
        ].filter(Boolean).join('\n');
    
    await createProjectEvent(
      projectId,
      dto.action === 'approve' 
        ? ProjectEventType.PROJECT_APPROVED 
        : ProjectEventType.PROJECT_REJECTED,
      dto.action === 'approve' 
        ? `项目已通过审核` 
        : `项目审核被驳回`,
      eventDesc,
      { adminId, reason: dto.reason },
      adminId,
      tx  // 传入事务客户端
    );
  });

  // 记录审计日志
  await createAuditLog({
    userId: adminId,
    action: dto.action === 'approve' ? 'APPROVE' : 'REJECT',
    objectType: 'PROJECT',
    objectId: projectId,
    summary: `${dto.action === 'approve' ? '通过' : '驳回'}项目审核`,
    metadata: { reason: dto.reason },
  });

  logger.info({ projectId, adminId, action: dto.action }, '项目审核完成');

  return getProjectById(projectId, adminId, 'FOUNDER', true);
};

/**
 * 更新项目
 */
export const updateProject = async (
  projectId: string,
  dto: UpdateProjectDto,
  userId: string,
  isAdmin: boolean
): Promise<ProjectDetail> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: {
        where: { role: 'LEADER', isDeleted: false },
        select: { userId: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查权限：负责人或管理员
  const isLeader = project.members.some((m) => m.userId === userId);
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以编辑项目');
  }

  await prisma.$transaction(async (tx) => {
    // 更新项目
    await tx.project.update({
      where: { id: projectId },
      data: {
        ...dto,
        businessStatus: dto.businessStatus as ProjectBusinessStatus,
      },
    });

    // 如果状态变更，创建事件
    if (dto.businessStatus && dto.businessStatus !== project.businessStatus) {
      await createProjectEvent(
        projectId,
        ProjectEventType.PROJECT_STATUS_CHANGED,
        `项目状态变更为「${dto.businessStatus}」`,
        undefined,
        { 
          oldStatus: project.businessStatus, 
          newStatus: dto.businessStatus,
        },
        userId,
        tx  // 传入事务客户端
      );
    }
  });

  logger.info({ projectId, userId }, '项目更新成功');

  return getProjectById(projectId, userId, 'FOUNDER', isAdmin);
};

/**
 * 获取待审核项目列表（管理员）
 */
export const getPendingProjects = async (): Promise<ProjectListItem[]> => {
  const projects = await prisma.project.findMany({
    where: {
      reviewStatus: ProjectReviewStatus.PENDING_REVIEW,
      ...notDeleted,
    },
    orderBy: { createdAt: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      members: {
        where: { isDeleted: false },
        select: { role: true },
      },
    },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    businessType: p.businessType,
    industry: p.industry,
    region: p.region,
    reviewStatus: p.reviewStatus,
    businessStatus: p.businessStatus,
    createdBy: p.createdBy,
    leadersCount: p.members.filter((m) => m.role === 'LEADER').length,
    membersCount: p.members.length,
    createdAt: p.createdAt,
  }));
};

/**
 * 获取项目统计
 */
export const getProjectStats = async (): Promise<ProjectStats> => {
  const [total, pending, approved, rejected, ongoing, paused, completed, abandoned] = 
    await Promise.all([
      prisma.project.count({ where: notDeleted }),
      prisma.project.count({ where: { reviewStatus: 'PENDING_REVIEW', ...notDeleted } }),
      prisma.project.count({ where: { reviewStatus: 'APPROVED', ...notDeleted } }),
      prisma.project.count({ where: { reviewStatus: 'REJECTED', ...notDeleted } }),
      prisma.project.count({ where: { businessStatus: 'ONGOING', ...notDeleted } }),
      prisma.project.count({ where: { businessStatus: 'PAUSED', ...notDeleted } }),
      prisma.project.count({ where: { businessStatus: 'COMPLETED', ...notDeleted } }),
      prisma.project.count({ where: { businessStatus: 'ABANDONED', ...notDeleted } }),
    ]);

  return {
    total,
    byReviewStatus: {
      PENDING_REVIEW: pending,
      APPROVED: approved,
      REJECTED: rejected,
    },
    byBusinessStatus: {
      ONGOING: ongoing,
      PAUSED: paused,
      COMPLETED: completed,
      ABANDONED: abandoned,
    },
  };
};

/**
 * 获取项目时间线
 */
export const getProjectEvents = async (
  projectId: string,
  currentUserId: string,
  currentRoleLevel: string,
  isAdmin: boolean
): Promise<any[]> => {
  // 先检查项目可见性
  await getProjectById(projectId, currentUserId, currentRoleLevel, isAdmin);

  const events = await prisma.projectEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  // 获取所有事件创建者的用户信息
  const creatorIds = [...new Set(events.map((e) => e.createdById).filter(Boolean))] as string[];
  const creators = creatorIds.length > 0 
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, avatar: true },
      })
    : [];
  const creatorMap = new Map(creators.map((u) => [u.id, u]));

  return events.map((e) => {
    const creator = e.createdById ? creatorMap.get(e.createdById) : null;
    return {
      id: e.id,
      eventType: e.eventType,
      title: e.title,
      description: e.description,
      payload: e.payload,
      createdAt: e.createdAt,
      createdById: e.createdById,
      createdByName: creator?.name || null,
      createdByAvatar: creator?.avatar || null,
    };
  });
};

// ================================
// 加入项目申请 (PRD 6.3.4)
// ================================

/**
 * 申请加入项目
 */
export const requestJoinProject = async (
  projectId: string,
  dto: JoinProjectDto,
  userId: string
): Promise<any> => {
  // 检查项目是否存在
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查是否已是成员
  const existingMember = await prisma.projectMember.findFirst({
    where: { projectId, userId, isDeleted: false },
  });

  if (existingMember) {
    throw new BadRequestError(ErrorCodes.PROJECT_ALREADY_MEMBER, '您已是项目成员');
  }

  // 检查是否已有待处理申请
  const existingRequest = await prisma.projectJoinRequest.findFirst({
    where: { projectId, userId, status: 'PENDING' },
  });

  if (existingRequest) {
    throw new BadRequestError(ErrorCodes.PROJECT_JOIN_PENDING, '您已有待处理的加入申请');
  }

  // 创建申请
  const request = await prisma.$transaction(async (tx) => {
    const newRequest = await tx.projectJoinRequest.create({
      data: {
        projectId,
        userId,
        role: dto.role,
        responsibility: dto.responsibility,
        intendedSharePercentage: dto.intendedSharePercentage,
        note: dto.note,
        status: 'PENDING',
      },
    });

    // 创建项目事件
    const requestDesc = [
      `[申请] 收到新的加入申请`,
      ``,
      `[申请人] 申请人：待确认`,
      `[角色] 申请角色：${dto.role === 'LEADER' ? '负责人' : '成员'}`,
      `[职责] 职责说明：${dto.responsibility || '未说明'}`,
      `[股份] 意向股份：${dto.intendedSharePercentage}%`,
      dto.note ? `[备注] 备注：${dto.note}` : null,
      ``,
      `[时间] 申请时间：${new Date().toLocaleDateString('zh-CN')}`,
    ].filter(Boolean).join('\n');
    
    await createProjectEvent(
      projectId,
      ProjectEventType.PROJECT_JOIN_REQUESTED,
      `收到加入项目申请`,
      requestDesc,
      {
        requestId: newRequest.id,
        userId,
        role: dto.role,
        intendedSharePercentage: dto.intendedSharePercentage,
      },
      userId,
      tx  // 传入事务客户端
    );

    return newRequest;
  });

  logger.info({ projectId, userId, requestId: request.id }, '加入项目申请已提交');

  return request;
};

/**
 * 获取项目的加入申请列表
 */
export const getJoinRequests = async (
  projectId: string,
  userId: string,
  isAdmin: boolean
): Promise<any[]> => {
  // 检查权限：负责人或管理员
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: {
        where: { role: 'LEADER', isDeleted: false },
        select: { userId: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  const isLeader = project.members.some((m) => m.userId === userId);
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以查看加入申请');
  }

  const requests = await prisma.projectJoinRequest.findMany({
    where: { projectId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  // 获取用户信息
  const userIds = requests.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return requests.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectName: r.project.name,
    user: userMap.get(r.userId) || { id: r.userId, name: '未知' },
    role: r.role,
    responsibility: r.responsibility,
    intendedSharePercentage: Number(r.intendedSharePercentage),
    note: r.note,
    status: r.status,
    createdAt: r.createdAt,
  }));
};

/**
 * 审批加入申请
 */
export const reviewJoinRequest = async (
  requestId: string,
  dto: ReviewJoinRequestDto,
  reviewerId: string,
  isAdmin: boolean
): Promise<any> => {
  const request = await prisma.projectJoinRequest.findUnique({
    where: { id: requestId },
    include: {
      project: {
        include: {
          members: { where: { role: 'LEADER', isDeleted: false }, select: { userId: true } },
        },
      },
    },
  });

  if (!request) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '申请不存在');
  }

  if (request.status !== 'PENDING') {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '申请已处理');
  }

  // 检查权限
  const isLeader = request.project.members.some((m) => m.userId === reviewerId);
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以审批加入申请');
  }

  const { action, actualSharePercentage, reason } = dto;

  await prisma.$transaction(async (tx) => {
    // 更新申请状态
    await tx.projectJoinRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        actualSharePercentage: action === 'approve' ? actualSharePercentage : undefined,
        reviewedById: reviewerId,
        reviewReason: reason,
      },
    });

    if (action === 'approve') {
      // 添加成员
      await tx.projectMember.create({
        data: {
          projectId: request.projectId,
          userId: request.userId,
          role: request.role,
        },
      });

      // 如果有股份，更新股权结构
      const sharePercentage = actualSharePercentage ?? Number(request.intendedSharePercentage);
      if (sharePercentage > 0) {
        // 获取用户名
        const user = await tx.user.findUnique({
          where: { id: request.userId },
          select: { name: true },
        });

        await tx.projectShare.create({
          data: {
            projectId: request.projectId,
            holderName: user?.name || '未知',
            holderId: request.userId,
            percentage: sharePercentage,
            note: `通过加入申请获得`,
          },
        });
      }

      // 创建事件
      const approveDesc = [
        `[通过] 加入申请已通过`,
        ``,
        `[成员] 新成员加入`,
        `[角色] 担任角色：${request.role === 'LEADER' ? '负责人' : '成员'}`,
        `[股份] 获得股份：${sharePercentage}%`,
        `[时间] 加入时间：${new Date().toLocaleDateString('zh-CN')}`,
      ].join('\n');
      
      await createProjectEvent(
        request.projectId,
        ProjectEventType.PROJECT_JOIN_APPROVED,
        `新成员加入项目`,
        approveDesc,
        {
          requestId,
          userId: request.userId,
          role: request.role,
          sharePercentage,
        },
        reviewerId,
        tx  // 传入事务客户端
      );
    } else {
      // 拒绝
      const rejectDesc = [
        `[驳回] 加入申请未通过`,
        ``,
        reason ? `[原因] 拒绝原因：${reason}` : null,
        `[时间] 处理时间：${new Date().toLocaleDateString('zh-CN')}`,
      ].filter(Boolean).join('\n');
      
      await createProjectEvent(
        request.projectId,
        ProjectEventType.PROJECT_JOIN_REJECTED,
        `加入项目申请被拒绝`,
        rejectDesc,
        { requestId, userId: request.userId, reason },
        reviewerId,
        tx  // 传入事务客户端
      );
    }
  });

  await createAuditLog({
    userId: reviewerId,
    action: action === 'approve' ? 'APPROVE' : 'REJECT',
    objectType: 'PROJECT_JOIN_REQUEST',
    objectId: requestId,
    summary: `${action === 'approve' ? '通过' : '拒绝'}加入项目申请`,
    metadata: { projectId: request.projectId, reason },
  });

  logger.info({ requestId, reviewerId, action }, '加入项目申请审批完成');

  return { success: true };
};

// ================================
// 项目进程记录 (PRD 6.3.8)
// ================================

import type { CreateProjectEventDto, CorrectEventDto } from './project.dto.js';

/**
 * 新建项目进程记录 (PRD 6.3.8.3)
 */
export const addProjectEvent = async (
  projectId: string,
  dto: CreateProjectEventDto,
  userId: string,
  isAdmin: boolean
): Promise<any> => {
  // 检查权限：负责人、记录员或管理员
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: {
        where: { isDeleted: false },
        select: { userId: true, role: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  const member = project.members.find((m) => m.userId === userId);
  const canAdd = isAdmin || (member && ['LEADER', 'RECORDER'].includes(member.role));
  if (!canAdd) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人、记录员或管理员可以添加项目进程');
  }

  const event = await prisma.projectEvent.create({
    data: {
      projectId,
      eventType: dto.eventType as ProjectEventType,
      title: dto.title,
      description: dto.description,
      createdById: userId,
    },
  });

  // 通知所有项目成员
  const memberIds = project.members.map(m => m.userId);
  await notifyProjectMembers(
    projectId,
    project.name,
    memberIds,
    'PROJECT_TIMELINE_EVENT',
    `项目进程更新`,
    `项目「${project.name}」有新的进程记录：${dto.title}`,
    userId
  );

  logger.info({ projectId, eventId: event.id, userId }, '项目进程记录已添加');

  return {
    id: event.id,
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    createdAt: event.createdAt,
  };
};

/**
 * 添加更正事件 (PRD 6.3.8.4)
 */
export const correctProjectEvent = async (
  projectId: string,
  dto: CorrectEventDto,
  userId: string,
  isAdmin: boolean
): Promise<any> => {
  // 检查被更正的事件是否存在
  const originalEvent = await prisma.projectEvent.findFirst({
    where: { id: dto.correctedEventId, projectId },
  });

  if (!originalEvent) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '原事件不存在或不属于该项目');
  }

  // 检查权限
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: {
        where: { isDeleted: false },
        select: { userId: true, role: true },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  const member = project.members.find((m) => m.userId === userId);
  const canCorrect = isAdmin || (member && ['LEADER', 'RECORDER'].includes(member.role));
  if (!canCorrect) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人、记录员或管理员可以更正项目进程');
  }

  // 创建更正事件
  const correctionEvent = await prisma.projectEvent.create({
    data: {
      projectId,
      eventType: ProjectEventType.EVENT_CORRECTED,
      title: `对「${originalEvent.title}」的更正/补充`,
      description: dto.correctionNote,
      correctedEventId: dto.correctedEventId,
      payload: {
        originalEventId: dto.correctedEventId,
        originalTitle: originalEvent.title,
      },
      createdById: userId,
    },
  });

  // 通知所有项目成员事件更正
  const memberIds = project.members.map(m => m.userId);
  await notifyProjectMembers(
    projectId,
    project.name,
    memberIds,
    'PROJECT_TIMELINE_EVENT',
    `项目进程更正`,
    `项目「${project.name}」的进程记录已更正：对「${originalEvent.title}」的更正/补充`,
    userId
  );

  logger.info({ 
    projectId, 
    correctedEventId: dto.correctedEventId, 
    newEventId: correctionEvent.id, 
    userId 
  }, '项目进程更正事件已添加');

  return {
    id: correctionEvent.id,
    eventType: correctionEvent.eventType,
    title: correctionEvent.title,
    description: correctionEvent.description,
    correctedEventId: correctionEvent.correctedEventId,
    createdAt: correctionEvent.createdAt,
  };
};

// ================================
// 成员管理 (PRD 6.4.2)
// ================================

import type { AddMemberDto, RemoveMemberDto, UpdateMemberRoleDto, AdjustSharesDto, ChangeBusinessStatusDto } from './project.dto.js';

/**
 * 直接添加项目成员（管理员/负责人操作）
 */
export const addMember = async (
  projectId: string,
  dto: AddMemberDto,
  operatorId: string,
  isAdmin: boolean
): Promise<{ success: boolean; memberId: string }> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: { where: { isDeleted: false }, select: { userId: true, role: true } },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查权限：负责人或管理员
  const isLeader = project.members.some((m) => m.userId === operatorId && m.role === 'LEADER');
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以添加成员');
  }

  // 检查目标用户是否已是成员
  const existingMember = project.members.find((m) => m.userId === dto.userId);
  if (existingMember) {
    throw new BadRequestError(ErrorCodes.PROJECT_ALREADY_MEMBER, '该用户已是项目成员');
  }

  // 检查用户是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id: dto.userId },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  const member = await prisma.$transaction(async (tx) => {
    // 添加成员
    const newMember = await tx.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    // 创建事件
    const joinDesc = [
      `[加入] 新成员加入项目`,
      ``,
      `[成员] 成员：${targetUser.name}`,
      `[角色] 角色：${dto.role === 'LEADER' ? '负责人' : '成员'}`,
      dto.responsibility ? `[职责] 职责说明：${dto.responsibility}` : null,
      dto.intendedSharePercentage !== undefined ? `[股份] 意向股份：${dto.intendedSharePercentage}%` : null,
      `[时间] 加入时间：${new Date().toLocaleDateString('zh-CN')}`,
      `[操作人] 添加人：管理员/负责人`,
    ].filter(Boolean).join('\n');
    
    await createProjectEvent(
      projectId,
      ProjectEventType.PROJECT_MEMBER_JOINED,
      `成员「${targetUser.name}」加入项目`,
      joinDesc,
      { userId: dto.userId, addedBy: operatorId, role: dto.role },
      operatorId,
      tx
    );

    return newMember;
  });

  // 通知新成员
  await sendNotification({
    eventType: 'PROJECT_MEMBER_JOINED' as any,
    targetUserIds: [dto.userId],
    actorId: operatorId,
    relatedObjectType: 'Project',
    relatedObjectId: projectId,
    title: '您已被添加到项目',
    content: `您已被添加为项目「${project.name}」的${dto.role === 'LEADER' ? '负责人' : '成员'}`,
    channels: ['INBOX'],
  });

  await createAuditLog({
    userId: operatorId,
    action: 'ADD',
    objectType: 'PROJECT_MEMBER',
    objectId: projectId,
    summary: `添加项目成员：${targetUser.name}`,
    metadata: { targetUserId: dto.userId, role: dto.role },
  });

  logger.info({ projectId, userId: dto.userId, addedBy: operatorId }, '项目成员已添加');

  return { success: true, memberId: member.id };
};

/**
 * 移除项目成员 (PRD 6.4.2 PROJECT_MEMBER_LEFT)
 */
export const removeMember = async (
  projectId: string,
  dto: RemoveMemberDto,
  operatorId: string,
  isAdmin: boolean
): Promise<{ success: boolean }> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: { where: { isDeleted: false }, select: { userId: true, role: true } },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查权限：负责人或管理员
  const isLeader = project.members.some((m) => m.userId === operatorId && m.role === 'LEADER');
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以移除成员');
  }

  // 检查目标成员是否存在
  const targetMember = project.members.find((m) => m.userId === dto.userId);
  if (!targetMember) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '该用户不是项目成员');
  }

  // 获取用户名用于事件记录
  const user = await prisma.user.findUnique({
    where: { id: dto.userId },
    select: { name: true },
  });

  await prisma.$transaction(async (tx) => {
    // 软删除成员
    await tx.projectMember.updateMany({
      where: { projectId, userId: dto.userId, isDeleted: false },
      data: { isDeleted: true },
    });

    // 创建事件
    const leaveDesc = [
      `[退出] 成员退出项目`,
      ``,
      `[成员] 成员：${user?.name || '未知'}`,
      dto.reason ? `[原因] 退出原因：${dto.reason}` : null,
      `[时间] 退出时间：${new Date().toLocaleDateString('zh-CN')}`,
    ].filter(Boolean).join('\n');
    
    await createProjectEvent(
      projectId,
      ProjectEventType.PROJECT_MEMBER_LEFT,
      `成员「${user?.name || '未知'}」退出项目`,
      leaveDesc,
      { userId: dto.userId, removedBy: operatorId },
      operatorId,
      tx  // 传入事务客户端
    );
  });

  await createAuditLog({
    userId: operatorId,
    action: 'REMOVE',
    objectType: 'PROJECT_MEMBER',
    objectId: `${projectId}:${dto.userId}`,
    summary: `移除项目成员 ${user?.name}`,
    metadata: { projectId, reason: dto.reason },
  });

  logger.info({ projectId, removedUserId: dto.userId, operatorId }, '项目成员已移除');

  return { success: true };
};

/**
 * 更新成员角色
 */
export const updateMemberRole = async (
  projectId: string,
  dto: UpdateMemberRoleDto,
  operatorId: string,
  isAdmin: boolean
): Promise<{ success: boolean }> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: { where: { isDeleted: false }, select: { userId: true, role: true, id: true } },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  const isLeader = project.members.some((m) => m.userId === operatorId && m.role === 'LEADER');
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以更改成员角色');
  }

  const targetMember = project.members.find((m) => m.userId === dto.userId);
  if (!targetMember) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '该用户不是项目成员');
  }

  const user = await prisma.user.findUnique({
    where: { id: dto.userId },
    select: { name: true },
  });

  const oldRole = targetMember.role;
  const roleNames: Record<string, string> = {
    LEADER: '负责人',
    MEMBER: '普通成员',
    RECORDER: '记录员',
  };

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.update({
      where: { id: targetMember.id },
      data: { role: dto.role },
    });

    await createProjectEvent(
      projectId,
      ProjectEventType.PROJECT_STATUS_CHANGED,
      `成员「${user?.name || '未知'}」角色变更`,
      `从「${roleNames[oldRole]}」变更为「${roleNames[dto.role]}」`,
      { userId: dto.userId, oldRole, newRole: dto.role },
      operatorId,
      tx  // 传入事务客户端
    );
  });

  logger.info({ projectId, userId: dto.userId, oldRole, newRole: dto.role }, '成员角色已更新');

  return { success: true };
};

// ================================
// 股权结构调整 (管理员功能, PRD 6.4.2 SHARE_STRUCTURE_CHANGED)
// ================================

/**
 * 调整项目股权结构
 */
export const adjustShares = async (
  projectId: string,
  dto: AdjustSharesDto,
  userId: string,
  isAdmin: boolean
): Promise<{ success: boolean }> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: { 
      shares: true,
      members: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 验证权限：管理员或项目负责人可调整股权
  const isLeader = project.members.some(m => m.userId === userId && m.role === 'LEADER');
  if (!isAdmin && !isLeader) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有管理员或项目负责人可以调整股权结构');
  }

  // 验证股权总和
  const totalPercentage = dto.shares.reduce((sum, s) => sum + s.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, `股权总和必须为 100%，当前为 ${totalPercentage}%`);
  }

  // 验证元征固定 51%
  const yuanzhengShare = dto.shares.find((s) => s.holderName === '元征' && !s.holderId);
  if (!yuanzhengShare || Math.abs(yuanzhengShare.percentage - 51) > 0.01) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '元征固定持股 51% 不可变更');
  }

  const oldShares = project.shares.map((s) => ({
    holderName: s.holderName,
    holderId: s.holderId,
    percentage: Number(s.percentage),
  }));

  await prisma.$transaction(async (tx) => {
    // 删除旧股权
    await tx.projectShare.deleteMany({ where: { projectId } });

    // 创建新股权
    for (const share of dto.shares) {
      await tx.projectShare.create({
        data: {
          projectId,
          holderName: share.holderName,
          holderId: share.holderId,
          percentage: share.percentage,
          note: share.note,
        },
      });
    }

    // 创建事件 - 构建详细描述
    const oldSharesDesc = oldShares.map((s: any) => `${s.holderName}(${Number(s.percentage).toFixed(1)}%)`).join('、');
    const newSharesDesc = dto.shares.map(s => `${s.holderName}(${Number(s.percentage).toFixed(1)}%)`).join('、');
    const changeDesc = [
      `[调整] 股权结构调整`,
      ``,
      `[变更前]`,
      `   ${oldSharesDesc}`,
      ``,
      `[变更后]`,
      `   ${newSharesDesc}`,
      ``,
      `[原因] 变更原因：${dto.reason}`,
      `[时间] 变更时间：${new Date().toLocaleDateString('zh-CN')}`,
    ].join('\n');
    
    await createProjectEvent(
      projectId,
      ProjectEventType.SHARE_STRUCTURE_CHANGED,
      `股权结构调整`,
      changeDesc,
      {
        oldShares,
        newShares: dto.shares,
        adjustedBy: userId,
      },
      userId,
      tx  // 传入事务客户端
    );
  });

  // 通知所有项目成员股权变更
  const memberIds = project.members.map(m => m.userId);
  await notifyProjectMembers(
    projectId,
    project.name,
    memberIds,
    'PROJECT_TIMELINE_EVENT',
    '股权结构变更',
    `项目「${project.name}」的股权结构已调整：${dto.reason}`,
    userId
  );

  await createAuditLog({
    userId,
    action: 'UPDATE',
    objectType: 'PROJECT_SHARES',
    objectId: projectId,
    summary: '调整项目股权结构',
    metadata: { reason: dto.reason, oldShares, newShares: dto.shares },
  });

  logger.info({ projectId, userId }, '项目股权结构已调整');

  return { success: true };
};

/**
 * 变更项目业务状态
 */
export const changeBusinessStatus = async (
  projectId: string,
  dto: ChangeBusinessStatusDto,
  operatorId: string,
  isAdmin: boolean
): Promise<{ success: boolean }> => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      members: { where: { role: 'LEADER', isDeleted: false }, select: { userId: true } },
    },
  });

  if (!project) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
  }

  // 检查权限
  const isLeader = project.members.some((m) => m.userId === operatorId);
  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有项目负责人或管理员可以变更项目状态');
  }

  // 审核未通过的项目不能变更业务状态
  if (project.reviewStatus !== 'APPROVED') {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '项目需审核通过后才能变更业务状态');
  }

  const oldStatus = project.businessStatus;
  const statusNames: Record<string, string> = {
    ONGOING: '进行中',
    PAUSED: '暂停',
    COMPLETED: '已完成',
    ABANDONED: '已废弃',
  };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { businessStatus: dto.businessStatus as ProjectBusinessStatus },
    });

    await createProjectEvent(
      projectId,
      dto.businessStatus === 'COMPLETED' 
        ? ProjectEventType.PROJECT_CLOSED 
        : ProjectEventType.PROJECT_STATUS_CHANGED,
      `项目状态变更为「${statusNames[dto.businessStatus]}」`,
      dto.reason,
      { oldStatus, newStatus: dto.businessStatus },
      operatorId,
      tx  // 传入事务客户端
    );
  });

  await createAuditLog({
    userId: operatorId,
    action: 'UPDATE',
    objectType: 'PROJECT',
    objectId: projectId,
    summary: `项目状态变更为 ${dto.businessStatus}`,
    metadata: { oldStatus, newStatus: dto.businessStatus, reason: dto.reason },
  });

  logger.info({ projectId, oldStatus, newStatus: dto.businessStatus }, '项目业务状态已变更');

  return { success: true };
};

