/**
 * 可见性工具
 * 元征 · 合伙人赋能平台
 * 
 * 实现 PRD 中定义的可见性模型：
 * - ALL: 所有合伙人可见
 * - ROLE_MIN_LEVEL: 指定最低角色等级可见
 * - CUSTOM: 自定义用户集合
 * 
 * 关键约束：低级别不得屏蔽高级别用户
 */

import { prisma } from './db.js';

// 可见范围类型
export type VisibilityScopeType = 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';

// 角色级别映射
export const ROLE_LEVEL_MAP: Record<string, number> = {
  PARTNER: 1,
  CORE_PARTNER: 2,
  FOUNDER: 3,
};

// 反向映射
export const LEVEL_ROLE_MAP: Record<number, string> = {
  1: 'PARTNER',
  2: 'CORE_PARTNER',
  3: 'FOUNDER',
};

/**
 * 可见性配置接口
 */
export interface VisibilityConfig {
  visibilityScopeType: VisibilityScopeType;
  visibilityMinRoleLevel?: number | null;
  visibilityUserIds?: string[];
}

/**
 * 检查用户是否有权查看某个对象
 */
export const canUserView = (
  userRoleLevel: number,
  userId: string,
  isAdmin: boolean,
  visibility: VisibilityConfig
): boolean => {
  // 管理员可见所有
  if (isAdmin) {
    return true;
  }

  switch (visibility.visibilityScopeType) {
    case 'ALL':
      return true;

    case 'ROLE_MIN_LEVEL':
      return userRoleLevel >= (visibility.visibilityMinRoleLevel ?? 1);

    case 'CUSTOM':
      // CUSTOM 模式：检查用户是否在列表中
      // 由于约束，高层级用户自动被包含
      return (
        (visibility.visibilityUserIds ?? []).includes(userId) ||
        userRoleLevel >= 3 // 联合创始人始终可见
      );

    default:
      return false;
  }
};

/**
 * 获取用户的角色级别数值
 */
export const getRoleLevelValue = (roleLevel: string): number => {
  return ROLE_LEVEL_MAP[roleLevel] ?? 1;
};

// 兼容性别名
export const getRoleLevel = getRoleLevelValue;

/**
 * 处理 CUSTOM 可见性：强制包含高层级用户
 * PRD 要求：低级别用户不能屏蔽更高级别用户
 * 
 * @param creatorRoleLevel 创建者的角色级别
 * @param customUserIds 用户指定的可见用户ID列表
 * @returns 处理后的用户ID列表（包含所有高层级用户）
 */
export const enforceHigherRoleVisibility = async (
  creatorRoleLevel: number,
  customUserIds: string[]
): Promise<string[]> => {
  // 获取所有角色级别高于创建者的用户
  const higherRoleUsers = await prisma.user.findMany({
    where: {
      OR: [
        // 更高层级的用户
        {
          roleLevel: {
            in: Object.entries(ROLE_LEVEL_MAP)
              .filter(([_, level]) => level > creatorRoleLevel)
              .map(([role]) => role) as any[],
          },
        },
        // 管理员
        { isAdmin: true },
      ],
      isDeleted: false,
    },
    select: { id: true },
  });

  const higherRoleUserIds = higherRoleUsers.map((u) => u.id);
  
  // 合并用户指定的ID和高层级用户ID（去重）
  const mergedUserIds = [...new Set([...customUserIds, ...higherRoleUserIds])];
  
  return mergedUserIds;
};

/**
 * 验证可见性配置的合法性
 * PRD 要求：不允许设置 visibility_min_role_level > 当前用户角色层级
 */
export const validateVisibilityConfig = (
  creatorRoleLevel: number,
  isAdmin: boolean,
  config: VisibilityConfig
): { valid: boolean; error?: string } => {
  // 管理员可以设置任意可见性
  if (isAdmin) {
    return { valid: true };
  }

  if (config.visibilityScopeType === 'ROLE_MIN_LEVEL') {
    const minLevel = config.visibilityMinRoleLevel ?? 1;
    if (minLevel > creatorRoleLevel) {
      return {
        valid: false,
        error: `不能设置比自己更高的角色级别可见性（您的级别：${creatorRoleLevel}，设置值：${minLevel}）`,
      };
    }
  }

  return { valid: true };
};

/**
 * 构建 Prisma 可见性过滤条件
 */
export const buildVisibilityFilter = (
  userRoleLevel: number,
  userId: string,
  isAdmin: boolean
): object => {
  // 管理员可见所有
  if (isAdmin) {
    return {};
  }

  return {
    OR: [
      // ALL 类型
      { visibilityScopeType: 'ALL' },
      
      // ROLE_MIN_LEVEL 类型：用户级别 >= 最低要求
      {
        AND: [
          { visibilityScopeType: 'ROLE_MIN_LEVEL' },
          { visibilityMinRoleLevel: { lte: userRoleLevel } },
        ],
      },
      
      // CUSTOM 类型：用户在列表中
      {
        AND: [
          { visibilityScopeType: 'CUSTOM' },
          { visibilityUserIds: { has: userId } },
        ],
      },
      
      // 联合创始人始终可见所有 CUSTOM
      ...(userRoleLevel >= 3
        ? [{ visibilityScopeType: 'CUSTOM' }]
        : []),
    ],
  };
};

/**
 * 简化的可见性过滤 - 用于 visibilityScopeType 字段的表
 * 支持 ALL | ROLE_MIN_LEVEL | CUSTOM 类型
 * 
 * 注意：此函数只处理基于 visibilityScopeType 的过滤，
 * 不包含 createdByUserId/ownerUserId 等字段，因为不同模型字段名不同。
 * 如需添加创建者/所有者过滤，请在调用方自行处理。
 */
export const applyVisibilityFilter = (
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean = false,
  baseWhere: object = {}
): object => {
  // 管理员可见所有
  if (isAdmin) {
    return baseWhere;
  }

  return {
    ...baseWhere,
    OR: [
      // ALL 类型：所有人可见
      { visibilityScopeType: 'ALL' },
      
      // ROLE_MIN_LEVEL 类型：根据 visibilityMinRoleLevel 过滤
      {
        AND: [
          { visibilityScopeType: 'ROLE_MIN_LEVEL' },
          {
            OR: [
              { visibilityMinRoleLevel: { lte: userRoleLevel } },
              { visibilityMinRoleLevel: null },
            ],
          },
        ],
      },
      
      // CUSTOM 类型：用户在自定义列表中
      {
        AND: [
          { visibilityScopeType: 'CUSTOM' },
          { visibilityUserIds: { has: userId } },
        ],
      },
      
      // 高层级用户（联合创始人）可见所有 CUSTOM 内容
      ...(userRoleLevel >= 3
        ? [{ visibilityScopeType: 'CUSTOM' }]
        : []),
    ],
  };
};

/**
 * 合并高层用户到 CUSTOM 可见性列表
 * PRD 要求：低级别用户不能屏蔽高级别用户
 */
export const mergeHigherRoleUsers = async (
  creatorRoleLevel: number,
  customUserIds: string[]
): Promise<string[]> => {
  // 使用 enforceHigherRoleVisibility 的别名，更符合语义
  return enforceHigherRoleVisibility(creatorRoleLevel, customUserIds);
};

/**
 * 检查并返回包含高层用户的可见性用户列表
 * 用于保存 CUSTOM 可见性时调用
 */
export const ensureHigherRolesIncluded = async (
  visibility: string,
  creatorRoleLevel: number,
  customUserIds: string[]
): Promise<string[]> => {
  // 只有 CUSTOM 类型需要合并高层用户
  if (visibility !== 'CUSTOM') {
    return customUserIds;
  }
  
  return mergeHigherRoleUsers(creatorRoleLevel, customUserIds);
};

// ================================
// 兼容性别名导出
// ================================

/**
 * 检查用户是否可以查看对象（兼容性别名）
 */
export const canUserSeeObject = (
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean,
  visibility: VisibilityConfig
): boolean => {
  return canUserView(userRoleLevel, userId, isAdmin, visibility);
};

/**
 * 按角色级别检查可见性
 */
export const canViewByRoleLevel = (
  userRoleLevel: number,
  minRoleLevel: number | null | undefined
): boolean => {
  return userRoleLevel >= (minRoleLevel ?? 1);
};

/**
 * 按自定义列表检查可见性
 */
export const canViewByCustomList = (
  userId: string,
  userRoleLevel: number,
  customUserIds: string[] | null | undefined
): boolean => {
  // 联合创始人始终可见
  if (userRoleLevel >= 3) {
    return true;
  }
  return (customUserIds ?? []).includes(userId);
};

