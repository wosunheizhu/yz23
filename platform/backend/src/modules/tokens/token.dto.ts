/**
 * Token 模块 DTO
 * Node 3: Token 账本
 * 
 * PRD 验收标准:
 * - 初始额度、不可透支
 * - 交易状态流转：待管理员审核 → 待收款确认 → 完成/拒绝/取消
 * - 管理员赠与/扣除、项目分红交易
 * - 账本严肃：交易不可物理删除
 */
import { z } from 'zod';

// ================================
// 枚举定义（与 Prisma schema 对应）
// ================================

export const TokenTransactionDirection = {
  TRANSFER: 'TRANSFER',
  ADMIN_GRANT: 'ADMIN_GRANT',
  ADMIN_DEDUCT: 'ADMIN_DEDUCT',
  DIVIDEND: 'DIVIDEND',
  MEETING_INVITE_REWARD: 'MEETING_INVITE_REWARD',
} as const;
export type TokenTransactionDirection = typeof TokenTransactionDirection[keyof typeof TokenTransactionDirection];

export const TokenTransactionStatus = {
  PENDING_ADMIN_APPROVAL: 'PENDING_ADMIN_APPROVAL',
  PENDING_RECEIVER_CONFIRM: 'PENDING_RECEIVER_CONFIRM',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type TokenTransactionStatus = typeof TokenTransactionStatus[keyof typeof TokenTransactionStatus];

// ================================
// 发起转账 (PRD 15.1)
// ================================
export const createTransferSchema = z.object({
  toUserId: z.string().cuid({ message: '收款人ID格式无效' }),
  amount: z.number().positive({ message: '转账金额必须大于0' }),
  reason: z.string().min(1, { message: '转账原因不能为空' }).max(500),
  relatedProjectId: z.string().cuid().optional(),
});
export type CreateTransferDto = z.infer<typeof createTransferSchema>;

// ================================
// 管理员审核转账 (PRD 15.1)
// ================================
export const adminReviewTransferSchema = z.object({
  approve: z.boolean(),
  comment: z.string().max(500).optional(),
});
export type AdminReviewTransferDto = z.infer<typeof adminReviewTransferSchema>;

// ================================
// 收款人确认 (PRD 15.1)
// ================================
export const receiverConfirmSchema = z.object({
  accept: z.boolean(),
  comment: z.string().max(500).optional(),
});
export type ReceiverConfirmDto = z.infer<typeof receiverConfirmSchema>;

// ================================
// 管理员赠与 (PRD 15.1)
// ================================
export const adminGrantSchema = z.object({
  toUserId: z.string().cuid({ message: '接收人ID格式无效' }),
  amount: z.number().positive({ message: '赠与金额必须大于0' }),
  reason: z.string().min(1, { message: '赠与原因不能为空' }).max(500),
  relatedProjectId: z.string().cuid().optional(),
});
export type AdminGrantDto = z.infer<typeof adminGrantSchema>;

// ================================
// 管理员扣除 (PRD 15.1)
// ================================
export const adminDeductSchema = z.object({
  fromUserId: z.string().cuid({ message: '被扣除人ID格式无效' }),
  amount: z.number().positive({ message: '扣除金额必须大于0' }),
  reason: z.string().min(1, { message: '扣除原因不能为空' }).max(500),
  relatedProjectId: z.string().cuid().optional(),
});
export type AdminDeductDto = z.infer<typeof adminDeductSchema>;

// ================================
// 项目分红 (PRD 15.1)
// ================================
export const distributeDividendSchema = z.object({
  projectId: z.string().cuid({ message: '项目ID格式无效' }),
  distributions: z.array(z.object({
    userId: z.string().cuid({ message: '用户ID格式无效' }),
    amount: z.number().positive({ message: '分红金额必须大于0' }),
    note: z.string().max(200).optional(),
  })).min(1, { message: '至少需要一个分红接收人' }),
  reason: z.string().min(1, { message: '分红说明不能为空' }).max(500),
});
export type DistributeDividendDto = z.infer<typeof distributeDividendSchema>;

// ================================
// 取消转账 (发起人在待审核阶段可取消)
// ================================
export const cancelTransferSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelTransferDto = z.infer<typeof cancelTransferSchema>;

// ================================
// 查询参数
// ================================
export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['TRANSFER', 'ADMIN_GRANT', 'ADMIN_DEDUCT', 'DIVIDEND', 'MEETING_INVITE_REWARD']).optional(),
  status: z.enum(['PENDING_ADMIN_APPROVAL', 'PENDING_RECEIVER_CONFIRM', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
  relatedProjectId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'completedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTransactionsQueryDto = z.infer<typeof listTransactionsQuerySchema>;

// ================================
// 待审核交易查询（管理员）
// ================================
export const listPendingTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['TRANSFER', 'ADMIN_GRANT', 'ADMIN_DEDUCT', 'DIVIDEND', 'MEETING_INVITE_REWARD']).optional(),
});
export type ListPendingTransactionsQueryDto = z.infer<typeof listPendingTransactionsQuerySchema>;

// ================================
// 待确认交易查询（收款人）
// ================================
export const listPendingConfirmQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListPendingConfirmQueryDto = z.infer<typeof listPendingConfirmQuerySchema>;

// ================================
// 响应类型
// ================================
export interface TokenAccountResponse {
  id: string;
  userId: string;
  balance: number;
  frozenAmount: number;      // 冻结金额（待审核转出）
  availableBalance: number;  // 可用余额 = balance - frozenAmount
  initialAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenTransactionResponse {
  id: string;
  fromUserId: string | null;
  fromUserName?: string;
  toUserId: string | null;
  toUserName?: string;
  amount: number;
  direction: TokenTransactionDirection;
  status: TokenTransactionStatus;
  reason: string | null;
  adminComment: string | null;
  adminUserId: string | null;
  adminUserName?: string;
  relatedProjectId: string | null;
  relatedProjectName?: string;
  relatedMeetingId: string | null;
  relatedGuestId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TransactionListResponse {
  items: TokenTransactionResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TokenStatsResponse {
  totalReceived: number;
  totalSent: number;
  totalGranted: number;
  totalDeducted: number;
  totalDividend: number;
  netChange: number;
}

// ================================
// 管理员 Token 总览 (PRD 6.2.7)
// ================================

// 查询所有用户余额列表
export const listAllAccountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(), // 搜索用户名
  sortBy: z.enum(['balance', 'initialAmount', 'createdAt', 'userName']).default('balance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListAllAccountsQueryDto = z.infer<typeof listAllAccountsQuerySchema>;

// 全局 Token 统计查询
export const globalTokenStatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.string().cuid().optional(), // 按项目筛选
});
export type GlobalTokenStatsQueryDto = z.infer<typeof globalTokenStatsQuerySchema>;

// 用户账户带用户信息
export interface UserTokenAccountResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  roleLevel: string;
  balance: number;
  initialAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  items: UserTokenAccountResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 全局 Token 统计响应
export interface GlobalTokenStatsResponse {
  // 总量统计
  totalBalance: number;           // 所有用户当前余额总和
  totalInitialAmount: number;     // 所有用户初始额度总和
  totalGranted: number;           // 管理员赠与总额
  totalDeducted: number;          // 管理员扣除总额
  totalTransferred: number;       // 普通转账总额
  totalDividend: number;          // 分红总额
  totalMeetingReward: number;     // 座谈会奖励总额
  
  // 交易统计
  completedTransactions: number;  // 已完成交易数
  pendingTransactions: number;    // 待处理交易数
  rejectedTransactions: number;   // 被拒绝交易数
}

// 按项目 Token 统计
export interface ProjectTokenStatsResponse {
  projectId: string;
  projectName: string;
  totalTransferred: number;       // 项目相关转账总额
  totalDividend: number;          // 项目分红总额
  transactionCount: number;       // 交易笔数
}

// 查询指定用户的交易记录（管理员）
export const adminListUserTransactionsQuerySchema = z.object({
  userId: z.string().cuid(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['TRANSFER', 'ADMIN_GRANT', 'ADMIN_DEDUCT', 'DIVIDEND', 'MEETING_INVITE_REWARD']).optional(),
  status: z.enum(['PENDING_ADMIN_APPROVAL', 'PENDING_RECEIVER_CONFIRM', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
});
export type AdminListUserTransactionsQueryDto = z.infer<typeof adminListUserTransactionsQuerySchema>;

// 管理员查询所有交易记录
export const adminListAllTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['TRANSFER', 'ADMIN_GRANT', 'ADMIN_DEDUCT', 'DIVIDEND', 'MEETING_INVITE_REWARD']).optional(),
  status: z.enum(['PENDING_ADMIN_APPROVAL', 'PENDING_RECEIVER_CONFIRM', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'completedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type AdminListAllTransactionsQueryDto = z.infer<typeof adminListAllTransactionsQuerySchema>;

