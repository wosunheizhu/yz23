/**
 * 需求 API 客户端
 * 元征 · 合伙人赋能平台
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

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
  createdAt: string;
}

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
    createdAt: string;
  }>;
}

export interface CreateDemandDto {
  projectId?: string | null;
  name: string;
  businessType: string;
  description: string;
  industry: string;
  demandType?: string;
  targetProfile?: any;
  ownerIds: string[];
  primaryOwnerId: string;
  rewardSharePercentage?: number;
  rewardTokenAmount?: number;
  rewardOther?: string;
  visibilityScopeType: string;
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
  note?: string;
  networkResourceIds?: string[];
}

export interface ListDemandsParams {
  page?: number;
  pageSize?: number;
  projectId?: string;
  demandType?: string;
  status?: string;
  businessType?: string;
  industry?: string;
  ownerId?: string;
  search?: string;
  sort?: string;
}

// ================================
// API 函数
// ================================

/**
 * 获取需求列表
 */
export const getDemands = async (params?: ListDemandsParams) => {
  const response = await apiClient.get<{
    success: boolean;
    data: DemandListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>('/demands', { params });
  return response.data;
};

/**
 * 获取需求详情
 */
export const getDemandById = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: DemandDetail;
  }>(`/demands/${id}`);
  return response.data.data;
};

/**
 * 创建需求
 */
export const createDemand = async (data: CreateDemandDto) => {
  const response = await apiClient.post<{
    success: boolean;
    data: DemandDetail;
  }>('/demands', data);
  return response.data.data;
};

/**
 * 更新需求
 */
export const updateDemand = async (id: string, data: Partial<CreateDemandDto>) => {
  const response = await apiClient.put<{
    success: boolean;
    data: DemandDetail;
  }>(`/demands/${id}`, data);
  return response.data.data;
};

/**
 * 关闭需求（正常完成）
 */
export const closeDemand = async (id: string, reason?: string) => {
  const response = await apiClient.post<{
    success: boolean;
    data: DemandDetail;
  }>(`/demands/${id}/close`, { reason });
  return response.data.data;
};

/**
 * 取消需求（提前终止）
 */
export const cancelDemand = async (id: string, reason: string) => {
  const response = await apiClient.post<{
    success: boolean;
    data: DemandDetail;
  }>(`/demands/${id}/cancel`, { reason });
  return response.data.data;
};

/**
 * 获取项目的所有需求
 */
export const getDemandsByProject = async (projectId: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: DemandListItem[];
  }>(`/demands/project/${projectId}`);
  return response.data.data;
};

// 需求类型映射
export const DEMAND_TYPE_LABELS: Record<string, string> = {
  GENERAL: '普通需求',
  NETWORK: '人脉需求',
};

// 需求状态映射
export const DEMAND_STATUS_LABELS: Record<string, string> = {
  OPEN: '开放中',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

// 需求状态颜色
export const DEMAND_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

// 紧急程度映射
export const URGENCY_LABELS: Record<string, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

// 业务类型映射
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  AGREEMENT_TRANSFER: '协议转让',
  MERGER_ACQUISITION: '并购重组',
  INDUSTRY_ENABLEMENT: '产业赋能',
  DEBT_BUSINESS: '债权业务',
  OTHER: '其他',
};

// 行业映射
export const INDUSTRY_LABELS: Record<string, string> = {
  FINANCE: '金融',
  REAL_ESTATE: '房地产',
  TECHNOLOGY: '科技',
  MANUFACTURING: '制造业',
  HEALTHCARE: '医疗健康',
  ENERGY: '能源',
  CONSUMER: '消费',
  OTHER: '其他',
};

// ================================
// 对象式 API（统一风格）
// ================================

export const demandsApi = {
  list: getDemands,
  listDemands: getDemands,
  getById: getDemandById,
  getDemand: getDemandById, // 别名，兼容旧代码
  create: createDemand,
  update: updateDemand,
  close: closeDemand,
  cancel: cancelDemand,
  getByProject: getDemandsByProject,
};

// 类型别名（兼容旧代码）
export type CreateDemandParams = CreateDemandDto;
export type Demand = DemandDetail;

// 函数别名（兼容旧代码）
export const getDemand = getDemandById;

