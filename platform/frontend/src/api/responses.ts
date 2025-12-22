/**
 * 响应 API 客户端
 * 元征 · 合伙人赋能平台
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

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
  createdAt: string;
}

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
  updatedAt: string;
}

export interface CreateResponseDto {
  demandId: string;
  content: string;
  intendedSharePercentage?: number;
  intendedTokenAmount?: number;
  intendedOther?: string;
  note?: string;
  networkResourceIds?: string[];
}

export interface ReviewResponseDto {
  action: 'accept' | 'reject';
  finalSharePercentage?: number;
  finalTokenAmount?: number;
  finalOther?: string;
  rejectReason?: string;
}

export interface ListResponsesParams {
  page?: number;
  pageSize?: number;
  demandId?: string;
  projectId?: string;
  responderId?: string;
  status?: string;
  search?: string;
  sort?: string;
}

// ================================
// API 函数
// ================================

/**
 * 获取响应列表
 */
export const getResponses = async (params?: ListResponsesParams) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ResponseListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>('/responses', { params });
  return response.data;
};

/**
 * 获取响应详情
 */
export const getResponseById = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}`);
  return response.data.data;
};

/**
 * 创建响应
 */
export const createResponse = async (data: CreateResponseDto) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>('/responses', data);
  return response.data.data;
};

/**
 * 审核响应
 */
export const reviewResponse = async (id: string, data: ReviewResponseDto) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}/review`, data);
  return response.data.data;
};

/**
 * 确认资源已使用
 */
export const confirmUsage = async (id: string, note?: string) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}/confirm-usage`, { note });
  return response.data.data;
};

/**
 * 发起修改/废弃申请
 */
export const modifyOrAbandon = async (
  id: string,
  action: 'modify' | 'abandon',
  reason: string,
  newReward?: {
    newSharePercentage?: number;
    newTokenAmount?: number;
    newOther?: string;
  }
) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}/modify-abandon`, { action, reason, ...newReward });
  return response.data.data;
};

/**
 * 获取我的响应
 */
export const getMyResponses = async () => {
  const response = await apiClient.get<{
    success: boolean;
    data: ResponseListItem[];
  }>('/responses/my');
  return response.data.data;
};

// ================================
// 修改/废弃裁决流程 (PRD 6.3.6.5)
// ================================

/**
 * 资源方确认修改/废弃申请
 */
export const confirmModifyOrAbandon = async (
  id: string,
  decision: 'accept' | 'reject',
  comment?: string
) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}/confirm-modify-abandon`, { decision, comment });
  return response.data.data;
};

/**
 * 管理员裁决
 */
export const adminArbitrate = async (
  id: string,
  decision: 'approve_modify' | 'approve_abandon' | 'continue_original',
  comment?: string,
  newReward?: {
    finalSharePercentage?: number;
    finalTokenAmount?: number;
    finalOther?: string;
  }
) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ResponseDetail;
  }>(`/responses/${id}/arbitrate`, { decision, comment, ...newReward });
  return response.data.data;
};

// 响应状态映射
export const RESPONSE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: '已提交',
  ACCEPTED_PENDING_USAGE: '已接受待使用',
  USED: '已使用',
  REJECTED: '已拒绝',
  ABANDONED: '已废弃',
  MODIFIED: '条款已修改',
  PENDING_MODIFY_CONFIRM: '待资源方确认修改',
  PENDING_ABANDON_CONFIRM: '待资源方确认废弃',
  PENDING_ADMIN_ARBITRATION: '待管理员裁决',
};

// 响应状态颜色
export const RESPONSE_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED_PENDING_USAGE: 'bg-blue-100 text-blue-800',
  USED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ABANDONED: 'bg-gray-100 text-gray-800',
  MODIFIED: 'bg-purple-100 text-purple-800',
  PENDING_MODIFY_CONFIRM: 'bg-orange-100 text-orange-800',
  PENDING_ABANDON_CONFIRM: 'bg-orange-100 text-orange-800',
  PENDING_ADMIN_ARBITRATION: 'bg-pink-100 text-pink-800',
};

// ================================
// 导出 API 对象
// ================================
export const responsesApi = {
  getResponses,
  getResponseById,
  createResponse,
  reviewResponse,
  confirmUsage,
  modifyOrAbandon,
  getMyResponses,
  confirmModifyOrAbandon,
  adminArbitrate,
};

