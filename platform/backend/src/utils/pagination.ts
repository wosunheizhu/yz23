/**
 * 分页工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #10: 列表接口都有分页/游标，避免全量拉取
 */

// 默认分页参数
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * 解析分页参数
 * 确保参数在合理范围内
 * 支持两种调用方式：
 * - parsePaginationParams(page, pageSize)
 * - parsePaginationParams({ page, pageSize })
 */
export const parsePaginationParams = (
  pageOrQuery?: string | number | { page?: string | number; pageSize?: string | number },
  pageSize?: string | number
): PaginationParams => {
  let page: string | number | undefined;
  let size: string | number | undefined;
  
  // 支持对象参数
  if (pageOrQuery && typeof pageOrQuery === 'object') {
    page = pageOrQuery.page;
    size = pageOrQuery.pageSize;
  } else {
    page = pageOrQuery;
    size = pageSize;
  }
  
  let parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page ?? DEFAULT_PAGE);
  let parsedPageSize = typeof size === 'string' ? parseInt(size, 10) : (size ?? DEFAULT_PAGE_SIZE);
  
  // 确保在合理范围内
  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = DEFAULT_PAGE;
  }
  if (isNaN(parsedPageSize) || parsedPageSize < 1) {
    parsedPageSize = DEFAULT_PAGE_SIZE;
  }
  if (parsedPageSize > MAX_PAGE_SIZE) {
    parsedPageSize = MAX_PAGE_SIZE;
  }
  
  return { page: parsedPage, pageSize: parsedPageSize };
};

/**
 * 计算 Prisma skip 值
 */
export const calculateSkip = (page: number, pageSize: number): number => {
  return (page - 1) * pageSize;
};

/**
 * 构建分页元数据
 */
export const buildPaginationMeta = (
  page: number,
  pageSize: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * 构建 Prisma 分页查询参数
 */
export const buildPrismaPageParams = (params: PaginationParams) => {
  return {
    skip: calculateSkip(params.page, params.pageSize),
    take: params.pageSize,
  };
};

/**
 * 构建分页结果
 */
export const buildPaginatedResult = <T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResult<T> => {
  return {
    data,
    pagination: buildPaginationMeta(page, pageSize, total),
  };
};

