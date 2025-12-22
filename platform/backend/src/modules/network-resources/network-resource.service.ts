/**
 * 人脉资源模块 Service
 * Node 4: 人脉资源体系
 * 
 * PRD 验收标准:
 * - 统一人脉资源表单组件后端能力（新建+选择+去重提示）
 * - 项目/需求/响应可关联人脉资源
 * - 去重提示测试（模糊：姓名+组织+职位）
 * - 可见性测试（敏感联系方式字段）
 * - 3 步内完成"+ 引荐"
 * - 关联后可在"我的贡献"统计口径正确聚合
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/db.js';
import { AppError, BadRequestError, NotFoundError, ForbiddenError, ErrorCodes } from '../../utils/errors.js';
import { sendNotification } from '../../utils/notification.js';
import { canViewByRoleLevel, canViewByCustomList, validateVisibilityConfig } from '../../utils/visibility.js';
import {
  CreateNetworkResourceDto,
  UpdateNetworkResourceDto,
  ListNetworkResourcesQueryDto,
  CheckDuplicateDto,
  UpdateContactStatusDto,
  LinkToObjectDto,
  CreateReferralDto,
  ListReferralsQueryDto,
  NetworkResourceResponse,
  NetworkResourceListResponse,
  ReferralResponse,
  ReferralListResponse,
  DuplicateCheckResult,
  MyContributionStats,
  PlatformNetworkStats,
} from './network-resource.dto.js';

// ================================
// 辅助函数
// ================================

const notDeleted = { isDeleted: false };

/**
 * 检查用户是否可以查看资源（基于可见性规则）
 */
const canViewResource = (
  resource: {
    visibilityScopeType: string;
    visibilityMinRoleLevel: number | null;
    visibilityUserIds: string[];
    createdByUserId: string;
  },
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): boolean => {
  // 管理员可见全部
  if (isAdmin) return true;
  
  // 创建者可见
  if (resource.createdByUserId === userId) return true;

  switch (resource.visibilityScopeType) {
    case 'ALL':
      return true;
    case 'ROLE_MIN_LEVEL':
      return canViewByRoleLevel(userRoleLevel, resource.visibilityMinRoleLevel || 1);
    case 'CUSTOM':
      return canViewByCustomList(userId, resource.visibilityUserIds);
    default:
      return false;
  }
};

/**
 * 格式化人脉资源响应（过滤敏感字段）
 */
const formatResourceResponse = (
  resource: any,
  canViewContact: boolean
): NetworkResourceResponse => ({
  id: resource.id,
  resourceType: resource.resourceType,
  name: resource.name,
  organization: resource.organization,
  title: resource.title,
  industryTags: resource.industryTags,
  region: resource.region,
  relationshipStrength: resource.relationshipStrength,
  relationshipDesc: resource.relationshipDesc,
  // 敏感字段：只有创建者或管理员可见
  contact: canViewContact ? resource.contact : null,
  note: resource.note,
  // 联系进展状态 (PRD 10.3)
  contactStatus: resource.contactStatus,
  contactStatusNote: resource.contactStatusNote,
  createdByUserId: resource.createdByUserId,
  createdByUserName: resource.createdBy?.name,
  visibilityScopeType: resource.visibilityScopeType,
  visibilityMinRoleLevel: resource.visibilityMinRoleLevel,
  visibilityUserIds: resource.visibilityUserIds,
  createdAt: resource.createdAt.toISOString(),
  updatedAt: resource.updatedAt.toISOString(),
  referralCount: resource._count?.referrals,
  projectLinkCount: resource._count?.projectLinks,
  demandLinkCount: resource._count?.demandLinks,
});

/**
 * 格式化引荐记录响应
 */
const formatReferralResponse = (
  referral: any,
  canViewContact: boolean
): ReferralResponse => ({
  id: referral.id,
  networkResourceId: referral.networkResourceId,
  networkResource: referral.networkResource
    ? formatResourceResponse(referral.networkResource, canViewContact)
    : undefined,
  referrerUserId: referral.referrerUserId,
  referrerUserName: referral.referrer?.name,
  // 点对点引荐：目标用户
  targetUserId: referral.targetUserId,
  targetUserName: referral.targetUser?.name,
  referralType: referral.referralType,
  relatedObjectType: referral.relatedObjectType,
  relatedObjectId: referral.relatedObjectId,
  relatedObjectName: undefined, // 需要额外查询
  description: referral.description,
  visibilityScopeType: referral.visibilityScopeType,
  visibilityMinRoleLevel: referral.visibilityMinRoleLevel,
  visibilityUserIds: referral.visibilityUserIds,
  createdAt: referral.createdAt.toISOString(),
  updatedAt: referral.updatedAt.toISOString(),
});

/**
 * 获取用户角色等级数字
 */
const getRoleLevelNumber = (roleLevel: string): number => {
  switch (roleLevel) {
    case 'FOUNDER': return 3;
    case 'CORE_PARTNER': return 2;
    case 'PARTNER': return 1;
    default: return 1;
  }
};

// ================================
// 人脉资源 CRUD
// ================================

/**
 * 创建人脉资源
 */
export const createNetworkResource = async (
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean,
  dto: CreateNetworkResourceDto
): Promise<NetworkResourceResponse> => {
  // PRD Gate #3: 低层不能屏蔽高层
  const roleLevelNum = getRoleLevelNumber(userRoleLevel);
  const visibilityValidation = validateVisibilityConfig(roleLevelNum, isAdmin, {
    visibilityScopeType: dto.visibilityScopeType,
    visibilityMinRoleLevel: dto.visibilityMinRoleLevel,
    visibilityUserIds: dto.visibilityUserIds,
  });
  if (!visibilityValidation.valid) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, visibilityValidation.error || '可见性配置无效');
  }

  const resource = await prisma.networkResource.create({
    data: {
      resourceType: dto.resourceType,
      name: dto.name,
      organization: dto.organization,
      title: dto.title,
      industryTags: dto.industryTags,
      region: dto.region,
      relationshipStrength: dto.relationshipStrength,
      relationshipDesc: dto.relationshipDesc,
      contact: dto.contact,
      note: dto.note,
      // 联系进展状态 (PRD 10.3)
      contactStatus: dto.contactStatus || 'PENDING',
      contactStatusNote: dto.contactStatusNote,
      createdByUserId: userId,
      visibilityScopeType: dto.visibilityScopeType,
      visibilityMinRoleLevel: dto.visibilityMinRoleLevel,
      visibilityUserIds: dto.visibilityUserIds || [],
    },
    include: {
      createdBy: { select: { name: true } },
      _count: {
        select: {
          referrals: true,
          projectLinks: true,
          demandLinks: true,
        },
      },
    },
  });

  // 发送通知（仅作者确认）
  await sendNotification({
    type: 'NETWORK_RESOURCE_CREATED',
    recipientId: userId,
    actorId: userId,
    objectType: 'NetworkResource',
    objectId: resource.id,
    title: '人脉资源创建成功',
    content: `您已成功创建人脉资源：${dto.name || dto.organization}`,
  });

  return formatResourceResponse(resource, true);
};

/**
 * 获取人脉资源详情
 */
export const getNetworkResource = async (
  resourceId: string,
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean
): Promise<NetworkResourceResponse> => {
  const resource = await prisma.networkResource.findFirst({
    where: { id: resourceId, ...notDeleted },
    include: {
      createdBy: { select: { name: true } },
      _count: {
        select: {
          referrals: true,
          projectLinks: true,
          demandLinks: true,
        },
      },
    },
  });

  if (!resource) {
    throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
  }

  // 可见性检查
  const roleLevelNum = getRoleLevelNumber(userRoleLevel);
  if (!canViewResource(resource, userId, roleLevelNum, isAdmin)) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此人脉资源');
  }

  // 敏感字段只有创建者或管理员可见
  const canViewContact = isAdmin || resource.createdByUserId === userId;

  return formatResourceResponse(resource, canViewContact);
};

/**
 * 更新人脉资源
 */
export const updateNetworkResource = async (
  resourceId: string,
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean,
  dto: UpdateNetworkResourceDto
): Promise<NetworkResourceResponse> => {
  const resource = await prisma.networkResource.findFirst({
    where: { id: resourceId, ...notDeleted },
  });

  if (!resource) {
    throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
  }

  // 只有创建者或管理员可编辑
  if (!isAdmin && resource.createdByUserId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有创建者或管理员可以编辑此人脉资源');
  }

  // PRD Gate #3: 低层不能屏蔽高层（只有在更新可见性时验证）
  if (dto.visibilityScopeType) {
    const roleLevelNum = getRoleLevelNumber(userRoleLevel);
    const visibilityValidation = validateVisibilityConfig(roleLevelNum, isAdmin, {
      visibilityScopeType: dto.visibilityScopeType,
      visibilityMinRoleLevel: dto.visibilityMinRoleLevel,
      visibilityUserIds: dto.visibilityUserIds,
    });
    if (!visibilityValidation.valid) {
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, visibilityValidation.error || '可见性配置无效');
    }
  }

  const updated = await prisma.networkResource.update({
    where: { id: resourceId },
    data: {
      name: dto.name,
      organization: dto.organization,
      title: dto.title,
      industryTags: dto.industryTags,
      region: dto.region,
      relationshipStrength: dto.relationshipStrength,
      relationshipDesc: dto.relationshipDesc,
      contact: dto.contact,
      note: dto.note,
      // 联系进展状态 (PRD 10.3)
      contactStatus: dto.contactStatus,
      contactStatusNote: dto.contactStatusNote,
      visibilityScopeType: dto.visibilityScopeType,
      visibilityMinRoleLevel: dto.visibilityMinRoleLevel,
      visibilityUserIds: dto.visibilityUserIds,
    },
    include: {
      createdBy: { select: { name: true } },
      _count: {
        select: {
          referrals: true,
          projectLinks: true,
          demandLinks: true,
        },
      },
    },
  });

  return formatResourceResponse(updated, true);
};

/**
 * 删除人脉资源（软删除）
 */
export const deleteNetworkResource = async (
  resourceId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const resource = await prisma.networkResource.findFirst({
    where: { id: resourceId, ...notDeleted },
  });

  if (!resource) {
    throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
  }

  // 只有创建者或管理员可删除
  if (!isAdmin && resource.createdByUserId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有创建者或管理员可以删除此人脉资源');
  }

  await prisma.networkResource.update({
    where: { id: resourceId },
    data: { isDeleted: true },
  });
};

/**
 * 更新联系进展状态 (PRD 10.3)
 * 快捷操作：标记"已联系/待联系/已引荐成功"
 */
export const updateContactStatus = async (
  resourceId: string,
  userId: string,
  isAdmin: boolean,
  dto: UpdateContactStatusDto
): Promise<NetworkResourceResponse> => {
  const resource = await prisma.networkResource.findFirst({
    where: { id: resourceId, ...notDeleted },
  });

  if (!resource) {
    throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
  }

  // 只有创建者或管理员可更新状态
  if (!isAdmin && resource.createdByUserId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有创建者或管理员可以更新联系进展');
  }

  const updated = await prisma.networkResource.update({
    where: { id: resourceId },
    data: {
      contactStatus: dto.contactStatus,
      contactStatusNote: dto.contactStatusNote,
    },
    include: {
      createdBy: { select: { name: true } },
      _count: {
        select: {
          referrals: true,
          projectLinks: true,
          demandLinks: true,
        },
      },
    },
  });

  return formatResourceResponse(updated, true);
};

/**
 * 查询人脉资源列表
 */
export const listNetworkResources = async (
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean,
  query: ListNetworkResourcesQueryDto
): Promise<NetworkResourceListResponse> => {
  const {
    page,
    pageSize,
    search,
    resourceType,
    industryTag,
    region,
    relationshipStrength,
    relationshipStrengthMin,
    contactStatus,
    visibilityScopeType,
    createdByMe,
    sortBy,
    sortOrder,
  } = query;

  const roleLevelNum = getRoleLevelNumber(userRoleLevel);

  // 构建可见性过滤条件
  const visibilityFilter: Prisma.NetworkResourceWhereInput = isAdmin
    ? {}
    : {
        OR: [
          // 自己创建的
          { createdByUserId: userId },
          // ALL 可见
          { visibilityScopeType: 'ALL' },
          // 角色级可见
          {
            visibilityScopeType: 'ROLE_MIN_LEVEL',
            visibilityMinRoleLevel: { lte: roleLevelNum },
          },
          // 自定义列表包含自己
          {
            visibilityScopeType: 'CUSTOM',
            visibilityUserIds: { has: userId },
          },
        ],
      };

  // 构建查询条件
  const where: Prisma.NetworkResourceWhereInput = {
    ...notDeleted,
    ...visibilityFilter,
    ...(resourceType && { resourceType }),
    ...(industryTag && { industryTags: { has: industryTag } }),
    ...(region && { region: { contains: region, mode: 'insensitive' } }),
    ...(relationshipStrength && { relationshipStrength }),
    ...(relationshipStrengthMin && { relationshipStrength: { gte: relationshipStrengthMin } }), // 最小值筛选
    ...(contactStatus && { contactStatus }), // 联系进展筛选
    ...(visibilityScopeType && { visibilityScopeType }), // 可见范围筛选
    ...(createdByMe && { createdByUserId: userId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { industryTags: { has: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.networkResource.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        _count: {
          select: {
            referrals: true,
            projectLinks: true,
            demandLinks: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.networkResource.count({ where }),
  ]);

  return {
    items: items.map((r) => 
      formatResourceResponse(r, isAdmin || r.createdByUserId === userId)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ================================
// 去重检查 (PRD 10.2)
// ================================

/**
 * 检查潜在重复的人脉资源
 * 按姓名+组织+职位模糊匹配
 */
export const checkDuplicate = async (
  dto: CheckDuplicateDto
): Promise<DuplicateCheckResult> => {
  const { name, organization, title } = dto;

  if (!name && !organization && !title) {
    return { hasPotentialDuplicates: false, duplicates: [] };
  }

  // 构建模糊匹配条件
  const conditions: Prisma.NetworkResourceWhereInput[] = [];
  
  if (name) {
    conditions.push({ name: { contains: name, mode: 'insensitive' } });
  }
  if (organization) {
    conditions.push({ organization: { contains: organization, mode: 'insensitive' } });
  }
  if (title) {
    conditions.push({ title: { contains: title, mode: 'insensitive' } });
  }

  // 至少匹配两个字段才算潜在重复
  const potentialDuplicates = await prisma.networkResource.findMany({
    where: {
      ...notDeleted,
      OR: conditions,
    },
    select: {
      id: true,
      name: true,
      organization: true,
      title: true,
    },
    take: 10,
  });

  // 计算相似度
  const duplicates = potentialDuplicates.map((dup) => {
    let matches = 0;
    let total = 0;

    if (name) {
      total++;
      if (dup.name?.toLowerCase().includes(name.toLowerCase())) matches++;
    }
    if (organization) {
      total++;
      if (dup.organization?.toLowerCase().includes(organization.toLowerCase())) matches++;
    }
    if (title) {
      total++;
      if (dup.title?.toLowerCase().includes(title.toLowerCase())) matches++;
    }

    return {
      id: dup.id,
      name: dup.name,
      organization: dup.organization,
      title: dup.title,
      similarity: total > 0 ? matches / total : 0,
    };
  }).filter((d) => d.similarity >= 0.5); // 相似度 >= 50% 才提示

  return {
    hasPotentialDuplicates: duplicates.length > 0,
    duplicates,
  };
};

// ================================
// 关联人脉资源到业务对象
// ================================

/**
 * 关联人脉资源到项目/需求/响应/会议
 */
export const linkToObject = async (
  userId: string,
  dto: LinkToObjectDto
): Promise<void> => {
  const { networkResourceId, objectType, objectId } = dto;

  // 检查资源存在
  const resource = await prisma.networkResource.findFirst({
    where: { id: networkResourceId, ...notDeleted },
  });
  if (!resource) {
    throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
  }

  let objectName = '';

  switch (objectType) {
    case 'PROJECT': {
      const project = await prisma.project.findUnique({
        where: { id: objectId },
        select: { name: true },
      });
      objectName = project?.name || '未知项目';
      await prisma.projectNetworkLink.upsert({
        where: {
          projectId_networkResourceId: { projectId: objectId, networkResourceId },
        },
        create: { projectId: objectId, networkResourceId },
        update: {},
      });
      break;
    }

    case 'DEMAND': {
      const demand = await prisma.demand.findUnique({
        where: { id: objectId },
        select: { name: true },
      });
      objectName = demand?.name || '未知需求';
      await prisma.demandNetworkLink.upsert({
        where: {
          demandId_networkResourceId: { demandId: objectId, networkResourceId },
        },
        create: { demandId: objectId, networkResourceId },
        update: {},
      });
      break;
    }

    case 'RESPONSE': {
      const response = await prisma.demandResponse.findUnique({
        where: { id: objectId },
        select: { demand: { select: { name: true } } },
      });
      objectName = response?.demand?.name || '未知响应';
      await prisma.responseNetworkLink.upsert({
        where: {
          responseId_networkResourceId: { responseId: objectId, networkResourceId },
        },
        create: { responseId: objectId, networkResourceId },
        update: {},
      });
      break;
    }

    case 'MEETING': {
      const meeting = await prisma.meeting.findUnique({
        where: { id: objectId },
        select: { topic: true },
      });
      objectName = meeting?.topic || '未知会议';
      await prisma.meetingNetworkLink.upsert({
        where: {
          meetingId_networkResourceId: { meetingId: objectId, networkResourceId },
        },
        create: { meetingId: objectId, networkResourceId },
        update: {},
      });
      break;
    }

    default:
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '不支持的关联对象类型');
  }

  // 通知资源创建者：引荐关联到业务对象 (PRD 21.2.H)
  if (resource.createdByUserId !== userId) {
    const objectTypeLabels: Record<string, string> = {
      PROJECT: '项目',
      DEMAND: '需求',
      RESPONSE: '响应',
      MEETING: '会议',
    };
    await sendNotification({
      type: 'NETWORK_RESOURCE_LINKED',
      recipientId: resource.createdByUserId,
      actorId: userId,
      objectType: 'NetworkResource',
      objectId: networkResourceId,
      title: '人脉资源被关联',
      content: `您创建的人脉资源"${resource.name || resource.organization}"已被关联到${objectTypeLabels[objectType]}：${objectName}`,
    });
  }
};

/**
 * 取消关联
 */
export const unlinkFromObject = async (
  userId: string,
  dto: LinkToObjectDto
): Promise<void> => {
  const { networkResourceId, objectType, objectId } = dto;

  switch (objectType) {
    case 'PROJECT':
      await prisma.projectNetworkLink.deleteMany({
        where: { projectId: objectId, networkResourceId },
      });
      break;

    case 'DEMAND':
      await prisma.demandNetworkLink.deleteMany({
        where: { demandId: objectId, networkResourceId },
      });
      break;

    case 'RESPONSE':
      await prisma.responseNetworkLink.deleteMany({
        where: { responseId: objectId, networkResourceId },
      });
      break;

    case 'MEETING':
      await prisma.meetingNetworkLink.deleteMany({
        where: { meetingId: objectId, networkResourceId },
      });
      break;
  }
};

// ================================
// 引荐记录 (PRD 10.4)
// ================================

/**
 * 创建引荐记录
 * 点对点引荐：引荐给特定合伙人，仅对方可见
 * 支持选择已有资源或新建资源
 */
export const createReferral = async (
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean,
  dto: CreateReferralDto
): Promise<ReferralResponse> => {
  let networkResourceId = dto.networkResourceId;
  const targetUserId = dto.targetUserId;

  // 验证目标用户存在
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true },
  });
  if (!targetUser) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '目标合伙人不存在');
  }

  // 不能引荐给自己
  if (targetUserId === userId) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '不能引荐给自己');
  }

  // 点对点引荐：强制设置可见性为CUSTOM，仅引荐人和目标用户可见
  const referralVisibilityUserIds = [userId, targetUserId];

  return await prisma.$transaction(async (tx) => {
    // 如果提供了新建资源，先创建（资源可见性也设为仅目标用户可见）
    if (dto.newResource && !networkResourceId) {
      const newResource = await tx.networkResource.create({
        data: {
          resourceType: dto.newResource.resourceType,
          name: dto.newResource.name,
          organization: dto.newResource.organization,
          title: dto.newResource.title,
          industryTags: dto.newResource.industryTags,
          region: dto.newResource.region,
          relationshipStrength: dto.newResource.relationshipStrength,
          relationshipDesc: dto.newResource.relationshipDesc,
          contact: dto.newResource.contact,
          note: dto.newResource.note,
          createdByUserId: userId,
          // 点对点引荐：资源也仅对目标用户可见
          visibilityScopeType: 'CUSTOM',
          visibilityMinRoleLevel: null,
          visibilityUserIds: referralVisibilityUserIds,
        },
      });
      networkResourceId = newResource.id;
    }

    if (!networkResourceId) {
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '必须提供人脉资源');
    }

    // 检查资源存在
    const resource = await tx.networkResource.findFirst({
      where: { id: networkResourceId, isDeleted: false },
    });
    if (!resource) {
      throw new NotFoundError(ErrorCodes.NETWORK_RESOURCE_NOT_FOUND, '人脉资源不存在');
    }

    // 更新资源可见性：添加目标用户到可见列表
    // 如果资源是公开的，则不需要更新；如果是CUSTOM，添加目标用户
    if (resource.visibilityScopeType === 'CUSTOM') {
      const existingUserIds = resource.visibilityUserIds as string[] || [];
      if (!existingUserIds.includes(targetUserId)) {
        await tx.networkResource.update({
          where: { id: networkResourceId },
          data: {
            visibilityUserIds: [...existingUserIds, targetUserId],
          },
        });
      }
    }

    // 创建引荐记录（点对点：仅引荐人和目标用户可见）
    const referral = await tx.networkReferral.create({
      data: {
        networkResourceId,
        referrerUserId: userId,
        targetUserId: targetUserId, // 新增：目标用户
        referralType: dto.referralType,
        relatedObjectType: dto.relatedObjectType,
        relatedObjectId: dto.relatedObjectId,
        description: dto.description,
        // 点对点引荐：固定为CUSTOM可见性
        visibilityScopeType: 'CUSTOM',
        visibilityMinRoleLevel: null,
        visibilityUserIds: referralVisibilityUserIds,
      },
      include: {
        networkResource: {
          include: {
            createdBy: { select: { name: true } },
          },
        },
        referrer: { select: { name: true } },
        targetUser: { select: { name: true } }, // 新增
      },
    });

    // 如果关联了对象，自动建立关联
    if (dto.relatedObjectType && dto.relatedObjectId) {
      switch (dto.relatedObjectType) {
        case 'PROJECT':
          await tx.projectNetworkLink.upsert({
            where: {
              projectId_networkResourceId: {
                projectId: dto.relatedObjectId,
                networkResourceId,
              },
            },
            create: { projectId: dto.relatedObjectId, networkResourceId },
            update: {},
          });
          break;
        case 'DEMAND':
          await tx.demandNetworkLink.upsert({
            where: {
              demandId_networkResourceId: {
                demandId: dto.relatedObjectId,
                networkResourceId,
              },
            },
            create: { demandId: dto.relatedObjectId, networkResourceId },
            update: {},
          });
          break;
        case 'MEETING':
          await tx.meetingNetworkLink.upsert({
            where: {
              meetingId_networkResourceId: {
                meetingId: dto.relatedObjectId,
                networkResourceId,
              },
            },
            create: { meetingId: dto.relatedObjectId, networkResourceId },
            update: {},
          });
          break;
      }
    }

    // 发送通知给目标用户（点对点引荐）
    const referrerUser = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    await sendNotification({
      type: 'REFERRAL_RECEIVED',
      recipientId: targetUserId, // 发送给目标用户
      actorId: userId,
      objectType: 'NetworkReferral',
      objectId: referral.id,
      title: '收到人脉引荐',
      content: `${referrerUser?.name || '合伙人'}向您引荐了人脉资源：${resource.name || resource.organization}`,
    });

    return formatReferralResponse(referral, true);
  });
};

/**
 * 获取引荐记录详情
 */
export const getReferral = async (
  referralId: string,
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean
): Promise<ReferralResponse> => {
  const referral = await prisma.networkReferral.findFirst({
    where: { id: referralId, isDeleted: false },
    include: {
      networkResource: {
        include: {
          createdBy: { select: { name: true } },
        },
      },
      referrer: { select: { name: true } },
      targetUser: { select: { name: true } },
    },
  });

  if (!referral) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '引荐记录不存在');
  }

  // 可见性检查
  const roleLevelNum = getRoleLevelNumber(userRoleLevel);
  if (!canViewResource(referral, userId, roleLevelNum, isAdmin)) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此引荐记录');
  }

  const canViewContact = isAdmin || referral.referrerUserId === userId;
  return formatReferralResponse(referral, canViewContact);
};

/**
 * 查询引荐记录列表
 */
export const listReferrals = async (
  userId: string,
  userRoleLevel: string,
  isAdmin: boolean,
  query: ListReferralsQueryDto
): Promise<ReferralListResponse> => {
  const {
    page,
    pageSize,
    referralType,
    referrerUserId,
    networkResourceId,
    relatedObjectType,
    relatedObjectId,
    myReferrals,
    sortBy,
    sortOrder,
  } = query;

  const roleLevelNum = getRoleLevelNumber(userRoleLevel);

  // 构建可见性过滤
  const visibilityFilter: Prisma.NetworkReferralWhereInput = isAdmin
    ? {}
    : {
        OR: [
          { referrerUserId: userId },
          { visibilityScopeType: 'ALL' },
          {
            visibilityScopeType: 'ROLE_MIN_LEVEL',
            visibilityMinRoleLevel: { lte: roleLevelNum },
          },
          {
            visibilityScopeType: 'CUSTOM',
            visibilityUserIds: { has: userId },
          },
        ],
      };

  const where: Prisma.NetworkReferralWhereInput = {
    isDeleted: false,
    ...visibilityFilter,
    ...(referralType && { referralType }),
    ...(referrerUserId && { referrerUserId }),
    ...(networkResourceId && { networkResourceId }),
    ...(relatedObjectType && { relatedObjectType }), // 按关联对象类型筛选
    ...(relatedObjectId && { relatedObjectId }),     // 按关联对象ID筛选
    ...(myReferrals && { referrerUserId: userId }),
  };

  const [items, total] = await Promise.all([
    prisma.networkReferral.findMany({
      where,
      include: {
        networkResource: {
          include: {
            createdBy: { select: { name: true } },
          },
        },
        referrer: { select: { name: true } },
        targetUser: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.networkReferral.count({ where }),
  ]);

  return {
    items: items.map((r) =>
      formatReferralResponse(r, isAdmin || r.referrerUserId === userId)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ================================
// 我的贡献统计 (PRD 9.1)
// ================================

/**
 * 获取我的人脉贡献统计
 */
export const getMyContributionStats = async (
  userId: string
): Promise<MyContributionStats> => {
  const [resourcesCreated, referralsCreated, projectLinksCount, demandLinksCount] =
    await Promise.all([
      // 我新增的人脉资源数
      prisma.networkResource.count({
        where: { createdByUserId: userId, ...notDeleted },
      }),
      // 我发起的人脉引荐数
      prisma.networkReferral.count({
        where: { referrerUserId: userId, isDeleted: false },
      }),
      // 我的资源被项目关联次数
      prisma.projectNetworkLink.count({
        where: {
          networkResource: { createdByUserId: userId, ...notDeleted },
        },
      }),
      // 我的资源被需求关联次数
      prisma.demandNetworkLink.count({
        where: {
          networkResource: { createdByUserId: userId, ...notDeleted },
        },
      }),
    ]);

  return {
    networkResourcesCreated: resourcesCreated,
    referralsCreated,
    projectLinksCount,
    demandLinksCount,
  };
};

/**
 * 获取资源的关联对象
 */
export const getResourceLinks = async (
  resourceId: string
): Promise<{
  projects: { id: string; name: string }[];
  demands: { id: string; name: string }[];
  responses: { id: string; demandName: string }[];
  meetings: { id: string; topic: string }[];
}> => {
  const [projectLinks, demandLinks, responseLinks, meetingLinks] = await Promise.all([
    prisma.projectNetworkLink.findMany({
      where: { networkResourceId: resourceId },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.demandNetworkLink.findMany({
      where: { networkResourceId: resourceId },
      include: { demand: { select: { id: true, name: true } } },
    }),
    prisma.responseNetworkLink.findMany({
      where: { networkResourceId: resourceId },
      include: { response: { select: { id: true, demand: { select: { name: true } } } } },
    }),
    prisma.meetingNetworkLink.findMany({
      where: { networkResourceId: resourceId },
      include: { meeting: { select: { id: true, topic: true } } },
    }),
  ]);

  return {
    projects: projectLinks.map((l) => ({ id: l.project.id, name: l.project.name })),
    demands: demandLinks.map((l) => ({ id: l.demand.id, name: l.demand.name })),
    responses: responseLinks.map((l) => ({
      id: l.response.id,
      demandName: l.response.demand.name,
    })),
    meetings: meetingLinks.map((l) => ({ id: l.meeting.id, topic: l.meeting.topic })),
  };
};

// ================================
// 管理员平台统计
// ================================

/**
 * 获取平台人脉资源全局统计（管理员专用）
 */
export const getPlatformStats = async (): Promise<PlatformNetworkStats> => {
  const [
    totalResources,
    totalReferrals,
    totalProjectLinks,
    totalDemandLinks,
    totalMeetingLinks,
    statusPending,
    statusContacted,
    statusSucceeded,
    statusFailed,
    typePerson,
    typeOrg,
    topContributorsRaw,
  ] = await Promise.all([
    prisma.networkResource.count({ where: notDeleted }),
    prisma.networkReferral.count({ where: { isDeleted: false } }),
    prisma.projectNetworkLink.count(),
    prisma.demandNetworkLink.count(),
    prisma.meetingNetworkLink.count(),
    prisma.networkResource.count({ where: { ...notDeleted, contactStatus: 'PENDING' } }),
    prisma.networkResource.count({ where: { ...notDeleted, contactStatus: 'CONTACTED' } }),
    prisma.networkResource.count({ where: { ...notDeleted, contactStatus: 'SUCCEEDED' } }),
    prisma.networkResource.count({ where: { ...notDeleted, contactStatus: 'FAILED' } }),
    prisma.networkResource.count({ where: { ...notDeleted, resourceType: 'PERSON' } }),
    prisma.networkResource.count({ where: { ...notDeleted, resourceType: 'ORG' } }),
    prisma.networkResource.groupBy({
      by: ['createdByUserId'],
      where: notDeleted,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  // 获取顶级贡献者的用户信息和引荐数
  const topContributors = await Promise.all(
    topContributorsRaw.map(async (item) => {
      const [user, referralCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: item.createdByUserId },
          select: { name: true },
        }),
        prisma.networkReferral.count({
          where: { referrerUserId: item.createdByUserId, isDeleted: false },
        }),
      ]);
      return {
        userId: item.createdByUserId,
        userName: user?.name || '未知用户',
        resourcesCreated: item._count.id,
        referralsCreated: referralCount,
      };
    })
  );

  return {
    totalResources,
    totalReferrals,
    totalProjectLinks,
    totalDemandLinks,
    totalMeetingLinks,
    resourcesByStatus: {
      PENDING: statusPending,
      CONTACTED: statusContacted,
      SUCCEEDED: statusSucceeded,
      FAILED: statusFailed,
    },
    resourcesByType: {
      PERSON: typePerson,
      ORG: typeOrg,
    },
    topContributors,
  };
};

