/**
 * 需求模块 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD 12: 需求模块
 * PRD 6.3.5: 需求发布表单
 */

import { z } from 'zod';
import { paginationSchema, sortSchema, visibilitySchema } from '../../utils/validation.js';
import { businessTypeSchema } from '../projects/project.dto.js';

/**
 * 需求类型
 */
export const demandTypeSchema = z.enum([
  'GENERAL',  // 普通需求
  'NETWORK',  // 人脉需求
]);

/**
 * 需求状态
 */
export const demandStatusSchema = z.enum([
  'OPEN',       // 开放中
  'CLOSED',     // 已关闭（正常完成）
  'CANCELLED',  // 已取消（提前终止）
]);

/**
 * 目标画像（人脉需求专用）
 */
export const targetProfileSchema = z.object({
  organization: z.string().optional(),
  title: z.string().optional(),
  industryTags: z.array(z.string()).optional(),
  region: z.string().optional(),
  relationshipMin: z.number().min(1).max(5).optional(),
  description: z.string().optional(),
});

/**
 * 创建普通需求表单 (PRD 6.3.5.1)
 */
export const createDemandSchema = z.object({
  // 所属项目（可选，不关联项目则为独立需求）
  projectId: z.string().cuid().optional().nullable(),
  
  // 需求名称（必填）
  name: z.string().min(1, '需求名称不能为空').max(200),
  
  // 业务类型（必填）
  businessType: businessTypeSchema,
  
  // 需求内容描述（必填）
  description: z.string().min(1, '需求内容描述不能为空').max(10000),
  
  // 需求行业（必填）
  industry: z.string().min(1, '请选择需求行业'),
  
  // 需求类型：普通/人脉
  demandType: demandTypeSchema.default('GENERAL'),
  
  // 人脉需求目标画像（人脉需求必填）
  targetProfile: targetProfileSchema.optional(),
  
  // 需求人（必填，多选；其中1人为owner）
  ownerIds: z.array(z.string().cuid()).min(1, '至少需要一名需求人'),
  
  // 需求管理人（owner）
  primaryOwnerId: z.string().cuid(),
  
  // 激励形式（必填）
  rewardSharePercentage: z.number().min(0).max(49).optional(),
  rewardTokenAmount: z.number().min(0).optional(),
  rewardOther: z.string().optional(),
  
  // 可见级别（必填）
  ...visibilitySchema.shape,
  
  // 备注（可选）
  note: z.string().max(5000).optional(),
  
  // 关联人脉资源（可选，v3增强）
  networkResourceIds: z.array(z.string().cuid()).optional(),
}).refine((data) => {
  // 人脉需求必须有目标画像
  if (data.demandType === 'NETWORK' && !data.targetProfile) {
    return false;
  }
  return true;
}, {
  message: '人脉需求必须填写目标画像',
  path: ['targetProfile'],
}).refine((data) => {
  // primaryOwnerId 必须在 ownerIds 中
  return data.ownerIds.includes(data.primaryOwnerId);
}, {
  message: '需求管理人必须是需求人之一',
  path: ['primaryOwnerId'],
}).refine((data) => {
  // 至少需要一种激励形式
  return (
    (data.rewardSharePercentage && data.rewardSharePercentage > 0) ||
    (data.rewardTokenAmount && data.rewardTokenAmount > 0) ||
    data.rewardOther
  );
}, {
  message: '请至少填写一种激励形式',
  path: ['rewardSharePercentage'],
});
export type CreateDemandDto = z.infer<typeof createDemandSchema>;

/**
 * 更新需求
 */
export const updateDemandSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  industry: z.string().optional(),
  targetProfile: targetProfileSchema.optional(),
  rewardSharePercentage: z.number().min(0).max(49).optional(),
  rewardTokenAmount: z.number().min(0).optional(),
  rewardOther: z.string().optional(),
  note: z.string().max(5000).optional(),
}).partial();
export type UpdateDemandDto = z.infer<typeof updateDemandSchema>;

/**
 * 关闭需求（正常完成）
 */
export const closeDemandSchema = z.object({
  reason: z.string().optional(),
});
export type CloseDemandDto = z.infer<typeof closeDemandSchema>;

/**
 * 取消需求（提前终止）
 */
export const cancelDemandSchema = z.object({
  reason: z.string().min(1, '取消原因不能为空').max(2000),
});
export type CancelDemandDto = z.infer<typeof cancelDemandSchema>;

/**
 * 需求列表查询参数
 */
export const listDemandsQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  demandType: demandTypeSchema.optional(),
  status: demandStatusSchema.optional(),
  businessType: businessTypeSchema.optional(),
  industry: z.string().optional(),
  ownerId: z.string().cuid().optional(),
  search: z.string().optional(),
}).merge(paginationSchema).merge(sortSchema);
export type ListDemandsQueryDto = z.infer<typeof listDemandsQuerySchema>;

/**
 * 需求列表项
 */
export interface DemandListItem {
  id: string;
  projectId: string | null;
  projectName: string | null;
  name: string;
  demandType: string;
  businessType: string;
  industry: string | null;
  status: string;
  rewardSummary: string;
  responsesCount: number;
  primaryOwner: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

/**
 * 需求详情
 */
export interface DemandDetail extends DemandListItem {
  description: string;
  targetProfile: any | null;
  rewardSharePercentage: number | null;
  rewardTokenAmount: number | null;
  rewardOther: string | null;
  note: string | null;
  owners: Array<{
    id: string;
    name: string;
    isOwner: boolean;
  }>;
  networkResources: Array<{
    id: string;
    name: string | null;
    organization: string | null;
  }>;
  responses: Array<{
    id: string;
    responderName: string;
    status: string;
    createdAt: Date;
  }>;
}

