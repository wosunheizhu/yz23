/**
 * 价值记录 API 客户端
 * 元征 · 合伙人赋能平台
 * 
 * 用于管理员记录项目创造的价值
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface ValueRecordListItem {
  id: string;
  projectId: string | null;
  projectName: string | null;
  amount: number;
  description: string;
  recordedAt: string;
  createdAt: string;
}

export interface ValueStats {
  totalAmount: number;
  recordCount: number;
  byMonth: Array<{
    month: string; // YYYY-MM
    amount: number;
  }>;
}

export interface CreateValueRecordDto {
  projectId?: string;
  amount: number;
  description: string;
  recordedAt?: string;
}

export interface ListValueRecordsParams {
  page?: number;
  pageSize?: number;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

// ================================
// API 函数
// ================================

/**
 * 获取价值统计（用于仪表盘价值曲线，所有用户可访问）
 */
export const getValueStats = async () => {
  const response = await apiClient.get<{
    success: boolean;
    data: ValueStats;
  }>('/value-records/stats');
  return response.data.data;
};

/**
 * 获取价值记录列表（管理员）
 */
export const getValueRecords = async (params?: ListValueRecordsParams) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ValueRecordListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>('/value-records', { params });
  return response.data;
};

/**
 * 获取价值记录详情（管理员）
 */
export const getValueRecordById = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ValueRecordListItem;
  }>(`/value-records/${id}`);
  return response.data.data;
};

/**
 * 创建价值记录（管理员）
 */
export const createValueRecord = async (data: CreateValueRecordDto) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ValueRecordListItem;
  }>('/value-records', data);
  return response.data.data;
};

/**
 * 更新价值记录（管理员）
 */
export const updateValueRecord = async (
  id: string,
  data: Partial<CreateValueRecordDto>
) => {
  const response = await apiClient.put<{
    success: boolean;
    data: ValueRecordListItem;
  }>(`/value-records/${id}`, data);
  return response.data.data;
};

/**
 * 删除价值记录（管理员）
 */
export const deleteValueRecord = async (id: string) => {
  const response = await apiClient.delete<{
    success: boolean;
    data: { success: boolean };
  }>(`/value-records/${id}`);
  return response.data.data;
};

/**
 * 格式化金额显示
 */
export const formatAmount = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)} 亿元`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)} 万元`;
  } else {
    return `${amount.toLocaleString()} 元`;
  }
};






