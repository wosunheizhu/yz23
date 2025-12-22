/**
 * 响应模块 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD 13: 响应模块
 * PRD 6.3.6: 响应需求
 */

import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../utils/validation.js';

/**
 * 响应状态
 */
export const responseStatusSchema = z.enum([
  'SUBMITTED',                   // 已提交
  'ACCEPTED_PENDING_USAGE',      // 已接受待使用
  'USED',                        // 已使用
  'REJECTED',                    // 已拒绝
  'ABANDONED',                   // 已废弃
  'MODIFIED',                    // 条款已修改
  'PENDING_MODIFY_CONFIRM',      // 待资源方确认修改
  'PENDING_ABANDON_CONFIRM',     // 待资源方确认废弃
  'PENDING_ADMIN_ARBITRATION',   // 待管理员裁决
]);

/**
 * 创建响应表单 (PRD 6.3.6.2)
 */
export const createResponseSchema = z.object({
  // 对应需求（必填）
  demandId: z.string().cuid(),
  
  // 响应内容描述（必填）
  content: z.string().min(1, '响应内容不能为空').max(10000),
  
  // 意向激励（必填，至少一种）
  intendedSharePercentage: z.number().min(0).max(49).optional(),
  intendedTokenAmount: z.number().min(0).optional(),
  intendedOther: z.string().optional(),
  
  // 备注（可选）
  note: z.string().max(5000).optional(),
  
  // 关联人脉资源（v3增强）
  networkResourceIds: z.array(z.string().cuid()).optional(),
}).refine((data) => {
  // 至少需要一种意向激励
  return (
    (data.intendedSharePercentage && data.intendedSharePercentage > 0) ||
    (data.intendedTokenAmount && data.intendedTokenAmount > 0) ||
    data.intendedOther
  );
}, {
  message: '请至少填写一种意向激励',
  path: ['intendedSharePercentage'],
});
export type CreateResponseDto = z.infer<typeof createResponseSchema>;

/**
 * 审核响应 (PRD 6.3.6.4)
 */
export const reviewResponseSchema = z.object({
  action: z.enum(['accept', 'reject']),
  
  // 接受时的最终激励条款
  finalSharePercentage: z.number().min(0).max(49).optional(),
  finalTokenAmount: z.number().min(0).optional(),
  finalOther: z.string().optional(),
  
  // 拒绝原因
  rejectReason: z.string().optional(),
}).refine((data) => {
  if (data.action === 'reject' && !data.rejectReason) {
    return false;
  }
  return true;
}, {
  message: '拒绝响应时必须填写原因',
  path: ['rejectReason'],
});
export type ReviewResponseDto = z.infer<typeof reviewResponseSchema>;

/**
 * 确认资源已使用
 */
export const confirmUsageSchema = z.object({
  note: z.string().optional(),
});
export type ConfirmUsageDto = z.infer<typeof confirmUsageSchema>;

/**
 * 修改/废弃响应申请 (PRD 6.3.6.5)
 */
export const modifyOrAbandonSchema = z.object({
  action: z.enum(['modify', 'abandon']),
  
  // 修改/废弃原因（必填）
  reason: z.string().min(1, '请填写原因'),
  
  // 新激励内容（修改时）
  newSharePercentage: z.number().min(0).max(49).optional(),
  newTokenAmount: z.number().min(0).optional(),
  newOther: z.string().optional(),
});
export type ModifyOrAbandonDto = z.infer<typeof modifyOrAbandonSchema>;

/**
 * 资源方确认修改/废弃
 */
export const confirmModifyAbandonSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  comment: z.string().optional(),
});
export type ConfirmModifyAbandonDto = z.infer<typeof confirmModifyAbandonSchema>;

/**
 * 管理员裁决
 */
export const adminDecisionSchema = z.object({
  decision: z.enum(['approve_modify', 'approve_abandon', 'continue_original']),
  comment: z.string().optional(),
  finalSharePercentage: z.number().min(0).max(49).optional(),
  finalTokenAmount: z.number().min(0).optional(),
  finalOther: z.string().optional(),
});
export type AdminDecisionDto = z.infer<typeof adminDecisionSchema>;

/**
 * 响应列表查询参数
 */
export const listResponsesQuerySchema = z.object({
  demandId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  responderId: z.string().cuid().optional(),
  status: responseStatusSchema.optional(),
  search: z.string().optional(),
}).merge(paginationSchema).merge(sortSchema);
export type ListResponsesQueryDto = z.infer<typeof listResponsesQuerySchema>;

/**
 * 响应列表项
 */
export interface ResponseListItem {
  id: string;
  demandId: string;
  demandName: string;
  projectId: string;
  projectName: string;
  responder: {
    id: string;
    name: string;
    avatar: string | null;
  };
  status: string;
  intendedRewardSummary: string;
  finalRewardSummary: string | null;
  createdAt: Date;
}

/**
 * 响应详情
 */
export interface ResponseDetail extends ResponseListItem {
  content: string;
  intendedSharePercentage: number | null;
  intendedTokenAmount: number | null;
  intendedOther: string | null;
  finalSharePercentage: number | null;
  finalTokenAmount: number | null;
  finalOther: string | null;
  rejectReason: string | null;
  modifyReason: string | null;
  note: string | null;
  networkResources: Array<{
    id: string;
    name: string | null;
    organization: string | null;
  }>;
  updatedAt: Date;
}

