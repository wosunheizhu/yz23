/**
 * 排序工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #11: 排序规则固定（created_at desc 等），避免翻页重复/缺失
 */

/**
 * 排序方向
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  order: SortOrder;
}

/**
 * 默认排序规则（按创建时间倒序 + ID 保证稳定性）
 */
export const DEFAULT_SORT: SortParams[] = [
  { field: 'createdAt', order: 'desc' },
  { field: 'id', order: 'asc' }, // 保证排序稳定性
];

/**
 * 允许的排序字段白名单（防止注入）
 */
export const ALLOWED_SORT_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'title',
  'status',
  'startTime',
  'endTime',
  'amount',
  'balance',
]);

/**
 * 解析排序参数
 * @param sortString 格式: "field:order,field:order" 如 "createdAt:desc,name:asc"
 * @param allowedFields 允许的字段白名单
 */
export const parseSortParams = (
  sortString?: string,
  allowedFields: Set<string> = ALLOWED_SORT_FIELDS
): SortParams[] => {
  if (!sortString) {
    return DEFAULT_SORT;
  }
  
  const result: SortParams[] = [];
  const parts = sortString.split(',');
  
  for (const part of parts) {
    const [field, order] = part.trim().split(':');
    
    if (!field || !allowedFields.has(field)) {
      continue; // 跳过不允许的字段
    }
    
    const normalizedOrder: SortOrder = order?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    result.push({ field, order: normalizedOrder });
  }
  
  // 如果没有有效排序，使用默认排序
  if (result.length === 0) {
    return DEFAULT_SORT;
  }
  
  // 确保包含 id 以保证稳定性
  if (!result.some(s => s.field === 'id')) {
    result.push({ field: 'id', order: 'asc' });
  }
  
  return result;
};

/**
 * 构建 Prisma orderBy 参数
 */
export const buildPrismaOrderBy = (sortParams: SortParams[]): Record<string, SortOrder>[] => {
  return sortParams.map(({ field, order }) => ({ [field]: order }));
};

/**
 * 快捷方法：解析并构建 Prisma orderBy
 */
export const parseSortToPrisma = (
  sortString?: string,
  allowedFields?: Set<string>
): Record<string, SortOrder>[] => {
  const params = parseSortParams(sortString, allowedFields);
  return buildPrismaOrderBy(params);
};






