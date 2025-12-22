/**
 * 意见反馈 API - Node 9
 * PRD 6.9.2: 意见反馈（Feedback）
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type FeedbackType = 'SUGGESTION' | 'BUG' | 'RULE' | 'COMPLAINT' | 'OTHER';
export type FeedbackStatus = 'PENDING' | 'PROCESSED';

export interface FeedbackResponse {
  id: string;
  userId: string;
  userName?: string;
  feedbackType: string;
  title: string;
  content: string;
  wantContact: boolean;
  contactInfo: string | null;
  status: string;
  response: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  data: FeedbackResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FeedbackStatsResponse {
  total: number;
  pending: number;
  processed: number;
  byType: {
    SUGGESTION: number;
    BUG: number;
    RULE: number;
    COMPLAINT: number;
    OTHER: number;
  };
}

export interface CreateFeedbackInput {
  feedbackType: FeedbackType;
  title: string;
  content: string;
  wantContact?: boolean;
  contactInfo?: string;
}

export interface ProcessFeedbackInput {
  response: string;
}

export interface ListFeedbacksQuery {
  status?: FeedbackStatus;
  feedbackType?: FeedbackType;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ================================
// 用户接口
// ================================

/**
 * 获取我的反馈列表
 */
export const listMyFeedbacks = async (
  page?: number,
  pageSize?: number
): Promise<FeedbackListResponse> => {
  const response = await apiClient.get('/feedbacks/my', {
    params: { page, pageSize },
  });
  return response.data;
};

/**
 * 获取反馈详情
 */
export const getFeedbackById = async (id: string): Promise<FeedbackResponse> => {
  const response = await apiClient.get(`/feedbacks/${id}`);
  return response.data;
};

/**
 * 提交意见反馈
 */
export const createFeedback = async (
  input: CreateFeedbackInput
): Promise<FeedbackResponse> => {
  const response = await apiClient.post('/feedbacks', input);
  return response.data;
};

// ================================
// 管理员接口
// ================================

/**
 * 获取所有反馈列表（管理员）
 */
export const listFeedbacks = async (
  query?: ListFeedbacksQuery
): Promise<FeedbackListResponse> => {
  const response = await apiClient.get('/feedbacks/admin/list', { params: query });
  return response.data;
};

/**
 * 获取反馈统计（管理员）
 */
export const getFeedbackStats = async (): Promise<FeedbackStatsResponse> => {
  const response = await apiClient.get('/feedbacks/admin/stats');
  return response.data;
};

/**
 * 处理反馈（管理员）
 */
export const processFeedback = async (
  id: string,
  input: ProcessFeedbackInput
): Promise<FeedbackResponse> => {
  const response = await apiClient.post(`/feedbacks/${id}/process`, input);
  return response.data;
};

// ================================
// 辅助函数
// ================================

export const getFeedbackTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SUGGESTION: '产品建议',
    BUG: 'Bug 反馈',
    RULE: '平台规则',
    OTHER: '其他',
  };
  return labels[type] || type;
};

export const getFeedbackStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    PENDING: '待处理',
    PROCESSED: '已处理',
  };
  return labels[status] || status;
};

// ================================
// 对象式 API（统一风格）
// ================================

export const feedbacksApi = {
  submitFeedback: createFeedback,
  listMyFeedbacks,
  getFeedbackById,
  list: listFeedbacks,
  getFeedbackStats,
  processFeedback,
  process: processFeedback,
};

