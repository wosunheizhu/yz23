/**
 * 验证工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #9: 必填/格式/范围校验齐全；后端字段级报错可定位
 */

import { z, ZodError, ZodSchema } from 'zod';
import { BadRequestError, ErrorCodes } from './errors.js';

/**
 * 验证请求体
 * 支持两种调用方式：
 * - validateBody(data, schema) - 旧格式
 * - validateBody(schema, data) - 新格式
 * @throws BadRequestError 验证失败时抛出
 */
export const validateBody = <T>(arg1: unknown, arg2: unknown): T => {
  // 判断参数顺序：如果 arg2 有 parse 方法，则是 (data, schema) 格式
  let schema: ZodSchema<T>;
  let data: unknown;
  
  if (arg2 && typeof (arg2 as ZodSchema).parse === 'function') {
    // (data, schema) 格式
    data = arg1;
    schema = arg2 as ZodSchema<T>;
  } else if (arg1 && typeof (arg1 as ZodSchema).parse === 'function') {
    // (schema, data) 格式
    schema = arg1 as ZodSchema<T>;
    data = arg2;
  } else {
    throw new Error('validateBody: 无效的参数');
  }
  
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = formatZodError(error);
      throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, details);
    }
    throw error;
  }
};

/**
 * 验证查询参数
 */
export const validateQuery = <T>(schema: ZodSchema<T>, data: unknown): T => {
  return validateBody(schema, data);
};

/**
 * 验证路径参数
 */
export const validateParams = <T>(schema: ZodSchema<T>, data: unknown): T => {
  return validateBody(schema, data);
};

/**
 * 格式化 Zod 错误为可读格式
 */
export const formatZodError = (error: ZodError): Record<string, unknown> => {
  const errors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  
  return {
    fields: errors,
    message: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
};

// ================================
// 通用验证 Schema
// ================================

/**
 * CUID 验证
 */
export const cuidSchema = z.string().cuid();

/**
 * UUID 验证
 */
export const uuidSchema = z.string().uuid();

/**
 * 邮箱验证
 */
export const emailSchema = z.string().email('邮箱格式不正确');

/**
 * 手机号验证（中国大陆）
 */
export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确');

/**
 * 密码验证（至少6位）
 */
export const passwordSchema = z.string().min(6, '密码至少6位');

/**
 * 分页参数 Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * 排序参数 Schema
 */
export const sortSchema = z.object({
  sort: z.string().optional(), // 格式: field 或 -field（降序）
});

/**
 * 可见性 Schema
 */
export const visibilitySchema = z.object({
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']),
  visibilityMinRoleLevel: z.number().int().min(1).max(3).optional().nullable(),
  visibilityUserIds: z.array(z.string()).optional().default([]),
});

/**
 * 日期时间 Schema（ISO 8601）
 */
export const dateTimeSchema = z.string().datetime({ offset: true });

/**
 * 日期范围 Schema
 */
export const dateRangeSchema = z.object({
  startTime: dateTimeSchema,
  endTime: dateTimeSchema,
}).refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  { message: '结束时间必须晚于开始时间' }
);

/**
 * ID 参数 Schema
 */
export const idParamSchema = z.object({
  id: cuidSchema,
});

// ================================
// 业务相关 Schema
// ================================

/**
 * 角色级别 Schema
 */
export const roleLevelSchema = z.enum(['PARTNER', 'CORE_PARTNER', 'FOUNDER']);

/**
 * 业务类型 Schema
 */
export const businessTypeSchema = z.enum([
  'AGREEMENT_TRANSFER',
  'MERGER_ACQUISITION',
  'INDUSTRY_ENABLEMENT',
  'DEBT_BUSINESS',
  'OTHER',
]);

/**
 * 需求类型 Schema
 */
export const demandTypeSchema = z.enum(['GENERAL', 'NETWORK']);

/**
 * 嘉宾分类 Schema
 */
export const guestCategorySchema = z.enum([
  'PUBLIC_CO_DMHG',
  'FIN_EXEC',
  'PUBLIC_CHAIRMAN_CONTROLLER',
  'MINISTRY_LEADER',
  'OTHER',
]);

