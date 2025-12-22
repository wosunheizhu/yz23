/**
 * Token 模块 API 客户端
 * Node 3: Token 账本
 */
import { apiClient } from './client';

// ================================
// 类型定义
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

// 状态中文标签
export const TRANSACTION_DIRECTION_LABELS: Record<TokenTransactionDirection, string> = {
  TRANSFER: '普通转账',
  ADMIN_GRANT: '管理员赠与',
  ADMIN_DEDUCT: '管理员扣除',
  DIVIDEND: '项目分红',
  MEETING_INVITE_REWARD: '座谈会邀请奖励',
};

export const TRANSACTION_STATUS_LABELS: Record<TokenTransactionStatus, string> = {
  PENDING_ADMIN_APPROVAL: '待管理员审核',
  PENDING_RECEIVER_CONFIRM: '待收款确认',
  COMPLETED: '已完成',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

export const TRANSACTION_STATUS_COLORS: Record<TokenTransactionStatus, string> = {
  PENDING_ADMIN_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_RECEIVER_CONFIRM: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

// Token 账户
export interface TokenAccount {
  id: string;
  userId: string;
  balance: number;
  frozenAmount: number;       // 冻结金额（待审核转出）
  availableBalance: number;   // 可用余额 = balance - frozenAmount
  initialAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Token 交易
export interface TokenTransaction {
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

// 交易列表响应
export interface TransactionListResponse {
  items: TokenTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Token 统计
export interface TokenStats {
  totalReceived: number;
  totalSent: number;
  totalGranted: number;
  totalDeducted: number;
  totalDividend: number;
  netChange: number;
}

// ================================
// 请求参数类型
// ================================

export interface CreateTransferParams {
  toUserId: string;
  amount: number;
  reason: string;
  relatedProjectId?: string;
}

export interface AdminReviewParams {
  approve: boolean;
  comment?: string;
}

export interface ReceiverConfirmParams {
  accept: boolean;
  comment?: string;
}

export interface AdminGrantParams {
  toUserId: string;
  amount: number;
  reason: string;
  relatedProjectId?: string;
}

export interface AdminDeductParams {
  fromUserId: string;
  amount: number;
  reason: string;
  relatedProjectId?: string;
}

export interface DistributeDividendParams {
  projectId: string;
  distributions: {
    userId: string;
    amount: number;
    note?: string;
  }[];
  reason: string;
}

export interface CancelTransferParams {
  reason?: string;
}

export interface ListTransactionsParams {
  page?: number;
  pageSize?: number;
  direction?: TokenTransactionDirection;
  status?: TokenTransactionStatus;
  relatedProjectId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'amount' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListPendingTransactionsParams {
  page?: number;
  pageSize?: number;
  direction?: TokenTransactionDirection;
}

export interface ListPendingConfirmParams {
  page?: number;
  pageSize?: number;
}

// ================================
// 用户功能 API
// ================================

/**
 * 获取我的 Token 账户
 */
export const getMyAccount = async (): Promise<TokenAccount> => {
  const response = await apiClient.get('/tokens/account');
  return response.data.data;
};

/**
 * 获取我的交易列表
 */
export const getMyTransactions = async (
  params?: ListTransactionsParams
): Promise<TransactionListResponse> => {
  const response = await apiClient.get('/tokens/transactions', { params });
  return response.data.data;
};

/**
 * 获取交易详情
 */
export const getTransaction = async (id: string): Promise<TokenTransaction> => {
  const response = await apiClient.get(`/tokens/transactions/${id}`);
  return response.data.data;
};

/**
 * 获取我的 Token 统计
 */
export const getMyStats = async (): Promise<TokenStats> => {
  const response = await apiClient.get('/tokens/stats');
  return response.data.data;
};

/**
 * 获取待我确认的交易
 */
export const getPendingConfirmTransactions = async (
  params?: ListPendingConfirmParams
): Promise<TransactionListResponse> => {
  const response = await apiClient.get('/tokens/pending-confirm', { params });
  return response.data.data;
};

/**
 * 发起转账
 */
export const createTransfer = async (
  data: CreateTransferParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post('/tokens/transfer', data);
  return response.data.data;
};

/**
 * 收款人确认
 */
export const confirmTransaction = async (
  id: string,
  data: ReceiverConfirmParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post(`/tokens/transactions/${id}/confirm`, data);
  return response.data.data;
};

/**
 * 取消转账（发起人在待审核阶段可取消）
 */
export const cancelTransfer = async (
  id: string,
  data: CancelTransferParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post(`/tokens/transactions/${id}/cancel`, data);
  return response.data.data;
};

// ================================
// 管理员功能 API
// ================================

/**
 * 获取待审核交易列表（管理员）
 */
export const getPendingTransactions = async (
  params?: ListPendingTransactionsParams
): Promise<TransactionListResponse> => {
  const response = await apiClient.get('/tokens/admin/pending', { params });
  return response.data.data;
};

/**
 * 获取所有交易记录（管理员）
 */
export const getAllTransactions = async (
  params?: ListTransactionsParams
): Promise<TransactionListResponse> => {
  const response = await apiClient.get('/tokens/admin/transactions', { params });
  return response.data.data;
};

/**
 * 审核转账（管理员）
 */
export const reviewTransaction = async (
  id: string,
  data: AdminReviewParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post(`/tokens/admin/transactions/${id}/review`, data);
  return response.data.data;
};

/**
 * 管理员赠与
 */
export const adminGrant = async (
  data: AdminGrantParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post('/tokens/admin/grant', data);
  return response.data.data;
};

/**
 * 管理员扣除
 */
export const adminDeduct = async (
  data: AdminDeductParams
): Promise<TokenTransaction> => {
  const response = await apiClient.post('/tokens/admin/deduct', data);
  return response.data.data;
};

/**
 * 项目分红
 */
export const distributeDividend = async (
  data: DistributeDividendParams
): Promise<TokenTransaction[]> => {
  const response = await apiClient.post('/tokens/admin/dividend', data);
  return response.data.data;
};

// ================================
// 管理员 Token 总览 (PRD 6.2.7)
// ================================

// 用户账户带用户信息
export interface UserTokenAccount {
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
  items: UserTokenAccount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 全局 Token 统计响应
export interface GlobalTokenStats {
  totalBalance: number;
  totalInitialAmount: number;
  totalGranted: number;
  totalDeducted: number;
  totalTransferred: number;
  totalDividend: number;
  totalMeetingReward: number;
  completedTransactions: number;
  pendingTransactions: number;
  rejectedTransactions: number;
}

// 按项目 Token 统计
export interface ProjectTokenStats {
  projectId: string;
  projectName: string;
  totalTransferred: number;
  totalDividend: number;
  transactionCount: number;
}

export interface ListAllAccountsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'balance' | 'initialAmount' | 'createdAt' | 'userName';
  sortOrder?: 'asc' | 'desc';
}

export interface GlobalTokenStatsParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}

/**
 * 获取所有用户余额列表（管理员）
 */
export const getAllAccounts = async (
  params?: ListAllAccountsParams
): Promise<AccountListResponse> => {
  const response = await apiClient.get('/tokens/admin/accounts', { params });
  return response.data.data;
};

/**
 * 获取指定用户的账户信息（管理员）
 */
export const getAccountByUserId = async (
  userId: string
): Promise<UserTokenAccount> => {
  const response = await apiClient.get(`/tokens/admin/accounts/${userId}`);
  return response.data.data;
};

/**
 * 获取全局 Token 统计（管理员）
 */
export const getGlobalStats = async (
  params?: GlobalTokenStatsParams
): Promise<GlobalTokenStats> => {
  const response = await apiClient.get('/tokens/admin/stats', { params });
  return response.data.data;
};

/**
 * 获取按项目的 Token 统计（管理员）
 */
export const getProjectStats = async (): Promise<ProjectTokenStats[]> => {
  const response = await apiClient.get('/tokens/admin/stats/projects');
  return response.data.data;
};

/**
 * 管理员查看指定用户的交易记录
 */
export const getUserTransactions = async (
  userId: string,
  params?: Omit<ListTransactionsParams, 'relatedProjectId'>
): Promise<TransactionListResponse> => {
  const response = await apiClient.get(`/tokens/admin/users/${userId}/transactions`, { params });
  return response.data.data;
};

// ================================
// 辅助函数
// ================================

/**
 * 格式化 Token 金额显示
 */
export const formatTokenAmount = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * 获取交易金额显示（带正负号）
 */
export const getTransactionAmountDisplay = (
  transaction: TokenTransaction,
  currentUserId: string
): { amount: string; isPositive: boolean } => {
  const isReceiving = transaction.toUserId === currentUserId;
  const isPositive = isReceiving || transaction.direction === 'ADMIN_GRANT' || transaction.direction === 'DIVIDEND';
  const sign = isPositive ? '+' : '-';
  return {
    amount: `${sign}${formatTokenAmount(transaction.amount)}`,
    isPositive,
  };
};

// ================================
// API 对象导出
// ================================

export const tokensApi = {
  // 用户功能
  getMyAccount,
  getMyTransactions,
  getTransaction,
  getMyStats,
  getPendingConfirmTransactions,
  createTransfer,
  confirmTransaction,
  cancelTransfer,
  // 管理员功能
  getPendingTransactions,
  getAllTransactions,
  reviewTransaction,
  adminGrant,
  adminDeduct,
  distributeDividend,
  getAllAccounts,
  getAccountByUserId,
  getGlobalStats,
  getProjectStats,
  getUserTransactions,
  // 别名
  listTransactions: async (params?: any) => {
    const response = await apiClient.get('/tokens/admin/transactions', { params });
    return response.data.data;
  },
  approveTransaction: async (id: string) => {
    return reviewTransaction(id, { approve: true });
  },
  rejectTransaction: async (id: string, reason: string) => {
    return reviewTransaction(id, { approve: false, comment: reason });
  },
  // 获取我的 Token 发放任务
  getMyGrantTasks: async (params?: { page?: number; pageSize?: number }) => {
    const response = await apiClient.get('/admin/token-grant-tasks/my', { params });
    return response;
  },
};

