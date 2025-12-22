/**
 * Token 发放任务 DTO - Node 5
 * PRD 20: 会后 Token 发放任务
 * PRD 23.5: TokenGrantTask API
 * 扩展: 支持线下到访来源
 */

import { z } from 'zod';

// ================================
// 枚举
// ================================

export const TokenGrantTaskStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type TokenGrantTaskStatus = (typeof TokenGrantTaskStatus)[keyof typeof TokenGrantTaskStatus];

export const TaskSource = {
  MEETING_GUEST: 'MEETING_GUEST',   // 座谈会外部嘉宾
  ONSITE_VISIT: 'ONSITE_VISIT',     // 线下到访记录
} as const;

export type TaskSource = (typeof TaskSource)[keyof typeof TaskSource];

// ================================
// 审核 Schema
// PRD 20.4: 管理员审核交互
// ================================

export const ApproveTaskSchema = z.object({
  amountOverride: z.number().positive().optional(), // 可调整金额
  comment: z.string().max(500).optional(),
});

export type ApproveTaskInput = z.infer<typeof ApproveTaskSchema>;

export const RejectTaskSchema = z.object({
  comment: z.string().max(500).optional(),
});

export type RejectTaskInput = z.infer<typeof RejectTaskSchema>;

// ================================
// 查询参数 Schema
// PRD 22.3: 列表筛选
// ================================

export const ListGrantTasksQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  taskSource: z.enum(['MEETING_GUEST', 'ONSITE_VISIT']).optional(), // 新增：任务来源筛选
  meetingId: z.string().optional(),
  onsiteVisitId: z.string().optional(), // 新增：线下到访ID筛选
  inviterId: z.string().optional(),
  guestCategory: z
    .enum([
      'PUBLIC_CO_DMHG',
      'FIN_EXEC',
      'PUBLIC_CHAIRMAN_CONTROLLER',
      'MINISTRY_LEADER',
      'OTHER',
    ])
    .optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('20'),
});

export type ListGrantTasksQuery = z.infer<typeof ListGrantTasksQuerySchema>;

// ================================
// 响应类型
// ================================

// 历史访问提醒类型
export interface GuestHistoryWarning {
  type: 'SAME_PERSON' | 'SAME_ORG';  // 同一人 或 同一组织
  message: string;                    // 提醒信息
  count: number;                      // 历史次数
  lastVisitDate?: Date;               // 上次来访时间
}

export interface GrantTaskResponse {
  id: string;
  taskSource: TaskSource; // 新增：任务来源
  // 座谈会嘉宾信息（可选）
  meeting: {
    id: string;
    topic: string;
    startTime: Date;
    endTime: Date;
    venue: {
      id: string;
      name: string;
    } | null;
  } | null;
  guest: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
  } | null;
  // 线下到访信息（可选）
  onsiteVisit: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
    visitDate: Date;
    venue: {
      id: string;
      name: string;
    } | null;
  } | null;
  inviter: {
    id: string;
    name: string;
    avatar: string | null;
  };
  status: TokenGrantTaskStatus;
  defaultAmount: number;
  finalAmount: number | null;
  admin: {
    id: string;
    name: string;
  } | null;
  adminComment: string | null;
  decidedAt: Date | null;
  tokenTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // 历史访问提醒
  historyWarnings?: GuestHistoryWarning[];
}

export interface GrantTaskListResponse {
  data: GrantTaskResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GrantTaskStatsResponse {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalGrantedAmount: number;
  thisMonthGrantedAmount: number;
}

