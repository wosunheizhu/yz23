/**
 * 软删除工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #5: 软删一致性：is_deleted 后列表不可见、详情按策略不可见（或仅管理员可见）
 */

/**
 * 软删除过滤条件
 * 默认排除已删除记录
 */
export const notDeleted = {
  isDeleted: false,
};

/**
 * 构建包含软删除过滤的 where 条件
 */
export const withNotDeleted = <T extends Record<string, unknown>>(
  where: T
): T & { isDeleted: false } => {
  return {
    ...where,
    isDeleted: false,
  };
};

/**
 * 构建管理员视角的 where 条件（可查看已删除）
 * @param isAdmin 是否为管理员
 * @param where 原始查询条件
 * @param includeDeleted 是否包含已删除（仅管理员有效）
 */
export const buildSoftDeleteFilter = <T extends Record<string, unknown>>(
  isAdmin: boolean,
  where: T,
  includeDeleted: boolean = false
): T | (T & { isDeleted: false }) => {
  // 管理员且明确要求包含已删除
  if (isAdmin && includeDeleted) {
    return where;
  }
  
  // 默认排除已删除
  return withNotDeleted(where);
};

/**
 * 软删除数据
 * 返回 Prisma update 数据
 */
export const softDeleteData = () => ({
  isDeleted: true,
  updatedAt: new Date(),
});

/**
 * 恢复软删除数据
 */
export const restoreData = () => ({
  isDeleted: false,
  updatedAt: new Date(),
});

/**
 * 检查记录是否已被软删除
 */
export const isSoftDeleted = (record: { isDeleted?: boolean }): boolean => {
  return record.isDeleted === true;
};

/**
 * 软删除策略类型
 */
export type SoftDeletePolicy = 
  | 'HIDE_FROM_ALL'          // 对所有人隐藏
  | 'VISIBLE_TO_ADMIN'       // 仅管理员可见
  | 'VISIBLE_TO_OWNER'       // 仅创建者可见
  | 'VISIBLE_TO_ADMIN_AND_OWNER'; // 管理员和创建者可见

/**
 * 根据策略判断是否可见
 */
export const isVisibleAfterDelete = (
  policy: SoftDeletePolicy,
  isAdmin: boolean,
  isOwner: boolean
): boolean => {
  switch (policy) {
    case 'HIDE_FROM_ALL':
      return false;
    case 'VISIBLE_TO_ADMIN':
      return isAdmin;
    case 'VISIBLE_TO_OWNER':
      return isOwner;
    case 'VISIBLE_TO_ADMIN_AND_OWNER':
      return isAdmin || isOwner;
    default:
      return false;
  }
};






