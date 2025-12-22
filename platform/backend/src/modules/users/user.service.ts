/**
 * 用户服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8: 账号/身份/合伙人档案
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { 
  NotFoundError, 
  ConflictError, 
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
import { getTokenInitialAmount } from '../../utils/systemConfig.js';
import { RoleLevel } from '@prisma/client';
import type {
  CreateUserDto,
  UpdateUserProfileDto,
  AdminUpdateUserDto,
  ListUsersQueryDto,
  UserListItem,
  UserDetail,
  UserStats,
} from './user.dto.js';

/**
 * 创建用户（管理员）(PRD 8.3)
 */
export const createUser = async (
  dto: CreateUserDto,
  adminId: string
): Promise<UserDetail> => {
  const { name, roleLevel, email, phone, password, joinedAt, gender, organization, isAdmin } = dto;

  // 检查邮箱/手机号是否已存在
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
    if (existingEmail) {
      throw new ConflictError(ErrorCodes.EMAIL_EXISTS, '该邮箱已被注册');
    }
  }

  if (phone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone, isDeleted: false },
    });
    if (existingPhone) {
      throw new ConflictError(ErrorCodes.PHONE_EXISTS, '该手机号已被注册');
    }
  }

  // 获取初始 Token 额度
  const initialAmount = getTokenInitialAmount(roleLevel as 'FOUNDER' | 'CORE_PARTNER' | 'PARTNER');

  // 如果提供密码，则加密
  let passwordHash: string | undefined;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  // 创建用户
  const user = await prisma.user.create({
    data: {
      name,
      roleLevel: roleLevel as RoleLevel,
      email,
      phone,
      gender,
      organization,
      passwordHash,
      joinedAt: joinedAt ? new Date(joinedAt as string) : new Date(),
      isAdmin: isAdmin ?? false,
      // 创建 Token 账户
      tokenAccount: {
        create: {
          balance: initialAmount,
          initialAmount,
        },
      },
    },
    include: {
      tokenAccount: {
        select: { balance: true },
      },
    },
  });

  // 记录审计日志
  await createAuditLog({
    userId: adminId,
    action: 'CREATE',
    objectType: 'USER',
    objectId: user.id,
    summary: `管理员创建用户: ${name}`,
    metadata: { roleLevel, isAdmin },
  });

  logger.info({ userId: user.id, adminId }, '管理员创建用户');

  return mapUserToDetail(user);
};

/**
 * 获取用户列表（合伙人名录）(PRD 8.5)
 */
export const listUsers = async (
  query: ListUsersQueryDto,
  currentUserId: string,
  currentRoleLevel: number,
  isAdmin: boolean
): Promise<PaginatedResult<UserListItem>> => {
  const { search, roleLevel, expertiseArea, tag, isAdmin: filterAdmin } = query;
  const pagination = parsePaginationParams(query);
  const orderBy = parseSortToPrisma(query.sort || '-joinedAt');

  // 构建查询条件
  const where: any = {
    ...notDeleted,
    // 可见性过滤（用户资料默认对所有登录用户可见）
    // 但敏感字段需要根据公开设置过滤
  };

  // 搜索
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { organization: { contains: search, mode: 'insensitive' } },
      { selfDescription: { contains: search, mode: 'insensitive' } },
    ];
  }

  // 角色级别筛选
  if (roleLevel) {
    where.roleLevel = roleLevel;
  }

  // 擅长领域筛选
  if (expertiseArea) {
    where.expertiseAreas = { has: expertiseArea };
  }

  // 标签筛选
  if (tag) {
    where.tags = { has: tag };
  }

  // 管理员筛选
  if (filterAdmin !== undefined) {
    where.isAdmin = filterAdmin;
  }

  // 查询
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: {
        id: true,
        name: true,
        roleLevel: true,
        isAdmin: true,
        avatar: true,
        selfDescription: true,
        expertiseAreas: true,
        organization: true,
        organizationPublic: true,
        tags: true,
        joinedAt: true,
        tokenAccount: {
          select: { balance: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // 过滤不公开的组织信息
  const items: UserListItem[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    roleLevel: u.roleLevel,
    isAdmin: u.isAdmin,
    avatar: u.avatar,
    selfDescription: u.selfDescription,
    expertiseAreas: u.expertiseAreas,
    organization: u.organizationPublic || isAdmin ? u.organization : null,
    tags: u.tags,
    joinedAt: u.joinedAt,
    tokenBalance: Number(u.tokenAccount?.balance ?? 0),
  }));

  return buildPaginatedResult(items, pagination.page, pagination.pageSize, total);
};

/**
 * 获取用户详情（PRD 6.1.4 C2）
 */
export const getUserById = async (
  userId: string,
  currentUserId: string,
  isAdmin: boolean
): Promise<UserDetail> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...notDeleted },
    include: {
      tokenAccount: {
        select: { balance: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  const isSelf = userId === currentUserId;

  // 获取统计信息（PRD 6.1.4 C2: 参与项目数、提供资源次数、邀请会议嘉宾次数）
  const stats = await getUserContributionStats(userId);

  // 根据公开设置过滤敏感字段
  return {
    id: user.id,
    name: user.name,
    roleLevel: user.roleLevel,
    isAdmin: user.isAdmin,
    avatar: user.avatar,
    selfDescription: user.selfDescription,
    expertiseAreas: user.expertiseAreas,
    tags: user.tags,
    joinedAt: user.joinedAt,
    gender: user.gender,
    birthDate: user.birthDate,
    hobbies: user.hobbies,
    signature: user.signature,
    education: user.education as any[],
    // 根据公开设置或权限过滤
    email: isSelf || isAdmin ? user.email : null,
    phone: isSelf || isAdmin ? user.phone : null,
    organization: user.organizationPublic || isSelf || isAdmin ? user.organization : null,
    contactInfo: user.contactInfoPublic || isSelf || isAdmin ? user.contactInfo : null,
    address: user.addressPublic || isSelf || isAdmin ? user.address : null,
    organizationPublic: user.organizationPublic,
    contactInfoPublic: user.contactInfoPublic,
    addressPublic: user.addressPublic,
    tokenBalance: isSelf || isAdmin ? user.tokenAccount?.balance : undefined,
    // 统计信息（PRD 6.1.4 C2）
    stats,
  };
};

/**
 * 获取用户贡献统计（PRD 6.1.4 C2）
 * 统计信息：参与项目数、提供资源次数、邀请会议嘉宾次数等
 */
export const getUserContributionStats = async (userId: string): Promise<{
  projectCount: number;
  resourceCount: number;
  guestInviteCount: number;
  networkResourceCount: number;
}> => {
  // TODO: 这些表在后续 Node 中实现，先返回占位数据
  // 实际实现需要统计 ProjectMember、Resource、MeetingGuest、NetworkResource 等表
  
  // 目前返回 0，待后续 Node 实现后补充
  return {
    projectCount: 0,        // 参与项目数（Node 2 实现后补充）
    resourceCount: 0,       // 提供资源次数（Node 4 实现后补充）
    guestInviteCount: 0,    // 邀请会议嘉宾次数（Node 6 实现后补充）
    networkResourceCount: 0, // 人脉资源数（Node 4 实现后补充）
  };
};

/**
 * 更新用户资料 (PRD 8.4)
 */
export const updateUserProfile = async (
  userId: string,
  dto: UpdateUserProfileDto,
  currentUserId: string
): Promise<UserDetail> => {
  // 只能更新自己的资料
  if (userId !== currentUserId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只能编辑自己的资料');
  }

  // 检查手机号是否已被其他用户使用（包括已删除的用户，因为数据库唯一约束是全局的）
  if (dto.phone) {
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: dto.phone,
        id: { not: userId },
      },
    });
    if (existingUser) {
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '该手机号已被其他用户使用');
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate as string) : null }),
        ...(dto.selfDescription !== undefined && { selfDescription: dto.selfDescription }),
        ...(dto.expertiseAreas && { expertiseAreas: dto.expertiseAreas }),
        ...(dto.organization !== undefined && { organization: dto.organization }),
        ...(dto.organizationPublic !== undefined && { organizationPublic: dto.organizationPublic }),
        ...(dto.contactInfo !== undefined && { contactInfo: dto.contactInfo }),
        ...(dto.contactInfoPublic !== undefined && { contactPublic: dto.contactInfoPublic }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.addressPublic !== undefined && { addressPublic: dto.addressPublic }),
        ...(dto.education && { education: JSON.stringify(dto.education) }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.hobbies && { hobbies: Array.isArray(dto.hobbies) ? JSON.stringify(dto.hobbies) : dto.hobbies }),
        ...(dto.signature !== undefined && { signature: dto.signature }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
      include: {
        tokenAccount: {
          select: { balance: true },
        },
      },
    });

    logger.info({ userId }, '用户更新资料');

    return mapUserToDetail(user);
  } catch (error: any) {
    // 捕获 Prisma 唯一约束错误
    if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '该手机号已被占用');
    }
    throw error;
  }
};

/**
 * 管理员更新用户
 */
export const adminUpdateUser = async (
  userId: string,
  dto: AdminUpdateUserDto,
  adminId: string
): Promise<UserDetail> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.roleLevel && { roleLevel: dto.roleLevel as RoleLevel }),
      ...(dto.isAdmin !== undefined && { isAdmin: dto.isAdmin }),
      ...(dto.isDeleted !== undefined && { isDeleted: dto.isDeleted }),
    },
    include: {
      tokenAccount: {
        select: { balance: true },
      },
    },
  });

  // 记录审计日志
  await createAuditLog({
    userId: adminId,
    action: 'UPDATE',
    objectType: 'USER',
    objectId: userId,
    summary: `管理员更新用户`,
    metadata: dto,
  });

  logger.info({ userId, adminId, updates: dto }, '管理员更新用户');

  return mapUserToDetail(user);
};

/**
 * 删除用户（软删除）
 */
export const deleteUser = async (
  userId: string,
  adminId: string
): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { isDeleted: true },
  });

  // 记录审计日志
  await createAuditLog({
    userId: adminId,
    action: 'SOFT_DELETE',
    objectType: 'USER',
    objectId: userId,
    summary: `管理员删除用户`,
  });

  logger.info({ userId, adminId }, '管理员删除用户');
};

/**
 * 获取用户统计
 */
export const getUserStats = async (): Promise<UserStats> => {
  const [total, founders, corePartners, partners, admins] = await prisma.$transaction([
    prisma.user.count({ where: notDeleted }),
    prisma.user.count({ where: { ...notDeleted, roleLevel: 'FOUNDER' } }),
    prisma.user.count({ where: { ...notDeleted, roleLevel: 'CORE_PARTNER' } }),
    prisma.user.count({ where: { ...notDeleted, roleLevel: 'PARTNER' } }),
    prisma.user.count({ where: { ...notDeleted, isAdmin: true } }),
  ]);

  return {
    totalUsers: total,
    byRoleLevel: {
      FOUNDER: founders,
      CORE_PARTNER: corePartners,
      PARTNER: partners,
    },
    adminCount: admins,
  };
};

/**
 * 获取所有擅长领域（用于筛选）
 */
export const getExpertiseAreas = async (): Promise<string[]> => {
  const users = await prisma.user.findMany({
    where: notDeleted,
    select: { expertiseAreas: true },
  });

  const areas = new Set<string>();
  users.forEach((u) => u.expertiseAreas.forEach((a) => areas.add(a)));
  
  return Array.from(areas).sort();
};

/**
 * 获取所有标签（用于筛选）
 */
export const getTags = async (): Promise<string[]> => {
  const users = await prisma.user.findMany({
    where: notDeleted,
    select: { tags: true },
  });

  const tags = new Set<string>();
  users.forEach((u) => u.tags.forEach((t) => tags.add(t)));
  
  return Array.from(tags).sort();
};

/**
 * 更新用户头像
 */
export const updateUserAvatar = async (
  userId: string,
  avatar: string
): Promise<{ avatar: string }> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar },
    select: { avatar: true },
  });

  logger.info({ userId }, '用户更新头像');

  return { avatar: user.avatar || '' };
};

/**
 * 映射用户到详情
 */
const mapUserToDetail = (user: any): UserDetail => ({
  id: user.id,
  name: user.name,
  roleLevel: user.roleLevel,
  isAdmin: user.isAdmin,
  avatar: user.avatar,
  selfDescription: user.selfDescription,
  expertiseAreas: user.expertiseAreas,
  organization: user.organization,
  tags: user.tags,
  joinedAt: user.joinedAt,
  email: user.email,
  phone: user.phone,
  gender: user.gender,
  birthDate: user.birthDate,
  contactInfo: user.contactInfo,
  address: user.address,
  education: user.education || [],
  hobbies: user.hobbies || [],
  signature: user.signature,
  organizationPublic: user.organizationPublic,
  contactInfoPublic: user.contactInfoPublic,
  addressPublic: user.addressPublic,
  tokenBalance: user.tokenAccount?.balance,
});

