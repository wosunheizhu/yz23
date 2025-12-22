/**
 * 价值记录 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD: 管理员记录项目创造的价值
 */

import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../utils/validation.js';

/**
 * 创建价值记录
 */
export const createValueRecordSchema = z.object({
  projectId: z.string().cuid().optional(),
  amount: z.number().min(0, '金额不能为负'),
  description: z.string().min(1, '描述不能为空').max(5000),
  recordedAt: z.string().datetime().optional(), // 默认当前时间
});
export type CreateValueRecordDto = z.infer<typeof createValueRecordSchema>;

/**
 * 更新价值记录
 */
export const updateValueRecordSchema = z.object({
  amount: z.number().min(0).optional(),
  description: z.string().min(1).max(5000).optional(),
  recordedAt: z.string().datetime().optional(),
}).partial();
export type UpdateValueRecordDto = z.infer<typeof updateValueRecordSchema>;

/**
 * 查询价值记录
 */
export const listValueRecordsQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).merge(paginationSchema).merge(sortSchema);
export type ListValueRecordsQueryDto = z.infer<typeof listValueRecordsQuerySchema>;

/**
 * 价值记录列表项
 */
export interface ValueRecordListItem {
  id: string;
  projectId: string | null;
  projectName: string | null;
  amount: number;
  description: string;
  recordedAt: Date;
  createdAt: Date;
}

/**
 * 价值统计
 */
export interface ValueStats {
  totalAmount: number;
  recordCount: number;
  byMonth: Array<{
    month: string; // YYYY-MM
    amount: number;
  }>;
}

