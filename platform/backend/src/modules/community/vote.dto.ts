/**
 * 投票 DTO - Node 10
 * PRD 17.3: 投票模块
 */

import { z } from 'zod';

// ================================
// 创建投票
// ================================

export const CreateVoteSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(5000),
  options: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
    })
  ).min(2, '至少需要两个选项'),
  passRule: z.string().max(500), // 通过规则描述
  deadline: z.string().datetime(),
  allowAbstain: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  // 可见性
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).default('ALL'),
  visibilityMinRoleLevel: z.number().int().min(0).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
  note: z.string().max(2000).optional(),
});

export type CreateVoteInput = z.infer<typeof CreateVoteSchema>;

// ================================
// 更新投票
// ================================

export const UpdateVoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  deadline: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});

export type UpdateVoteInput = z.infer<typeof UpdateVoteSchema>;

// ================================
// 投票记录
// ================================

export const CastVoteSchema = z.object({
  option: z.string().min(1), // 选择的选项 key
});

export type CastVoteInput = z.infer<typeof CastVoteSchema>;

// ================================
// 查询投票列表
// ================================

export const ListVotesQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  creatorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListVotesQuery = z.infer<typeof ListVotesQuerySchema>;

// ================================
// 响应类型
// ================================

export interface VoteOption {
  key: string;
  label: string;
}

export interface VoteResponse {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  options: VoteOption[];
  passRule: string;
  deadline: string;
  allowAbstain: boolean;
  isAnonymous: boolean;
  status: string;
  visibilityScopeType: string;
  note: string | null;
  totalVotes: number;
  myVote: string | null; // 当前用户的投票选项
  createdAt: string;
  updatedAt: string;
}

export interface VoteDetailResponse extends VoteResponse {
  results: Record<string, number>; // 各选项票数
  voters?: Array<{ userId: string; userName: string; option: string }>; // 非匿名时可见
}

export interface VoteListResponse {
  data: VoteResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}






