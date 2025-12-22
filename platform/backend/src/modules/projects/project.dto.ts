/**
 * 项目模块 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD 11: 项目管理模块
 * PRD 6.3: 项目管理详细需求
 */

import { z } from 'zod';
import { paginationSchema, sortSchema, visibilitySchema } from '../../utils/validation.js';

/**
 * 业务类型枚举
 */
export const businessTypeSchema = z.enum([
  'AGREEMENT_TRANSFER',  // 协议转让
  'MERGER_ACQUISITION',  // 并购重组
  'INDUSTRY_ENABLEMENT', // 产业赋能
  'DEBT_BUSINESS',       // 债权业务
  'OTHER',               // 其他
]);

/**
 * 项目审核状态
 */
export const projectReviewStatusSchema = z.enum([
  'PENDING_REVIEW',  // 待管理员审核
  'APPROVED',        // 已通过
  'REJECTED',        // 已驳回
]);

/**
 * 项目业务状态
 */
export const projectBusinessStatusSchema = z.enum([
  'ONGOING',    // 进行中
  'PAUSED',     // 暂停
  'COMPLETED',  // 已完成
  'ABANDONED',  // 废弃
]);

/**
 * 股权分配项
 */
export const shareItemSchema = z.object({
  holderName: z.string().min(1, '持有者名称不能为空'),
  holderId: z.string().optional(), // 如果是用户，需要用户ID
  percentage: z.number().min(0).max(100, '股权比例需在0-100之间'),
  note: z.string().optional(),
});

/**
 * 项目成员项
 */
export const memberItemSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['LEADER', 'MEMBER']),
});

/**
 * 创建项目表单 (PRD 6.3.3)
 */
export const createProjectSchema = z.object({
  // 必填字段
  name: z.string().min(1, '项目名称不能为空').max(100),
  businessType: businessTypeSchema,
  
  // 可选字段
  industry: z.string().optional(),
  region: z.string().optional(),
  description: z.string().max(5000).optional(),
  
  // 关联项目（可选）
  linkedProjectIds: z.array(z.string().cuid()).optional(),
  linkDescription: z.string().optional(),
  
  // 负责人（必填，可多选）
  leaders: z.array(z.string().cuid()).min(1, '至少需要一名负责人'),
  
  // 普通成员（可选）
  members: z.array(z.string().cuid()).optional(),
  
  // 股权结构（必填）
  // 51% 固定为元征，剩余 49% 需分配完毕
  shares: z.array(shareItemSchema).refine((shares) => {
    const total = shares.reduce((sum, s) => sum + s.percentage, 0);
    // 必须包含元征的51%，总计100%
    const hasYuanzheng = shares.some(s => s.holderName === '元征' && s.percentage === 51);
    return hasYuanzheng && Math.abs(total - 100) < 0.01;
  }, {
    message: '股权结构必须包含元征51%，且总计100%',
  }),
  
  // 初始状态
  businessStatus: projectBusinessStatusSchema.default('ONGOING'),
  
  // 可见性
  ...visibilitySchema.shape,
  
  // 首个需求（可选）
  initialDemand: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    businessType: businessTypeSchema,
    rewardType: z.enum(['SHARE', 'TOKEN', 'OTHER']).optional(),
    rewardValue: z.string().optional(),
  }).optional(),
  
  // 关联人脉资源（v3新增）
  networkResourceIds: z.array(z.string().cuid()).optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

/**
 * 更新项目
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  description: z.string().max(5000).optional(),
  businessStatus: projectBusinessStatusSchema.optional(),
}).partial();
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

/**
 * 审核项目（管理员）
 */
export const reviewProjectSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});
export type ReviewProjectDto = z.infer<typeof reviewProjectSchema>;

/**
 * 加入项目申请表单 (PRD 6.3.4)
 */
export const joinProjectSchema = z.object({
  role: z.enum(['LEADER', 'MEMBER']),
  responsibility: z.string().min(1, '请描述加入后的职责'),
  intendedSharePercentage: z.number().min(0).max(49, '意向股份不能超过49%'),
  note: z.string().optional(),
});
export type JoinProjectDto = z.infer<typeof joinProjectSchema>;

/**
 * 审批加入申请
 */
export const reviewJoinRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  actualSharePercentage: z.number().min(0).max(49).optional(),
  reason: z.string().optional(),
});
export type ReviewJoinRequestDto = z.infer<typeof reviewJoinRequestSchema>;

/**
 * 项目列表查询参数
 */
export const listProjectsQuerySchema = z.object({
  search: z.string().optional(),
  businessType: businessTypeSchema.optional(),
  reviewStatus: projectReviewStatusSchema.optional(),
  businessStatus: projectBusinessStatusSchema.optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  createdById: z.string().cuid().optional(),
  myProjects: z.coerce.boolean().optional(), // 仅我参与的项目（成员或负责人）
  leadOnly: z.coerce.boolean().optional(), // 仅我领导的项目
}).merge(paginationSchema).merge(sortSchema);
export type ListProjectsQueryDto = z.infer<typeof listProjectsQuerySchema>;

/**
 * 项目列表项
 */
export interface ProjectListItem {
  id: string;
  name: string;
  businessType: string;
  industry: string | null;
  region: string | null;
  reviewStatus: string;
  businessStatus: string;
  createdBy: {
    id: string;
    name: string;
  };
  leadersCount: number;
  membersCount: number;
  createdAt: Date;
}

/**
 * 项目详情
 */
export interface ProjectDetail extends ProjectListItem {
  description: string | null;
  leaders: Array<{
    id: string;
    name: string;
    avatar: string | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string | null;
    joinedAt: Date;
  }>;
  shares: Array<{
    holderName: string;
    holderId: string | null;
    percentage: number;
    note: string | null;
  }>;
  linkedProjects: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  demandsCount: number;
  eventsCount: number;
}

/**
 * 加入申请
 */
export interface JoinRequest {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  role: string;
  responsibility: string;
  intendedSharePercentage: number;
  note: string | null;
  status: string;
  createdAt: Date;
}

/**
 * 项目统计
 */
export interface ProjectStats {
  total: number;
  byReviewStatus: {
    PENDING_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
  };
  byBusinessStatus: {
    ONGOING: number;
    PAUSED: number;
    COMPLETED: number;
    ABANDONED: number;
  };
}

/**
 * 新建项目进程记录 (PRD 6.3.8.3)
 */
export const createProjectEventSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().min(1, '内容不能为空').max(10000),
  eventType: z.enum(['MILESTONE_ADDED', 'NOTE']).default('NOTE'),
});
export type CreateProjectEventDto = z.infer<typeof createProjectEventSchema>;

/**
 * 更正事件 (PRD 6.3.8.4)
 */
export const correctEventSchema = z.object({
  correctedEventId: z.string().cuid(),
  correctionNote: z.string().min(1, '更正说明不能为空').max(5000),
});
export type CorrectEventDto = z.infer<typeof correctEventSchema>;

/**
 * 直接添加成员（管理员/负责人操作）
 */
export const addMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['LEADER', 'MEMBER']),
  responsibility: z.string().optional(),
  intendedSharePercentage: z.number().min(0).max(49).optional(),
});
export type AddMemberDto = z.infer<typeof addMemberSchema>;

/**
 * 移除成员 (PRD 6.4.2 PROJECT_MEMBER_LEFT)
 */
export const removeMemberSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().optional(),
});
export type RemoveMemberDto = z.infer<typeof removeMemberSchema>;

/**
 * 更新成员角色
 */
export const updateMemberRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['LEADER', 'MEMBER', 'RECORDER']),
});
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;

/**
 * 股权结构调整 (PRD 6.4.2 SHARE_STRUCTURE_CHANGED, 管理员)
 */
export const adjustSharesSchema = z.object({
  shares: z.array(z.object({
    holderName: z.string(),
    holderId: z.string().cuid().optional(),
    percentage: z.number().min(0).max(100),
    note: z.string().optional(),
  })),
  reason: z.string().min(1, '调整原因不能为空'),
});
export type AdjustSharesDto = z.infer<typeof adjustSharesSchema>;

/**
 * 变更项目业务状态
 */
export const changeBusinessStatusSchema = z.object({
  businessStatus: z.enum(['ONGOING', 'PAUSED', 'COMPLETED', 'ABANDONED']),
  reason: z.string().optional(),
});
export type ChangeBusinessStatusDto = z.infer<typeof changeBusinessStatusSchema>;

