/**
 * 场地管理 API 客户端 - Node 5
 * PRD 23.1: Venue（场地）API
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type VenueStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';

export interface CreateVenueInput {
  name: string;
  address?: string;
  capacity?: number;
  supportsMeal?: boolean;
  note?: string;
}

export interface UpdateVenueInput {
  name?: string;
  address?: string | null;
  capacity?: number | null;
  supportsMeal?: boolean;
  note?: string | null;
}

export interface ListVenuesQuery {
  status?: VenueStatus;
  supportsMeal?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface VenueResponse {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  supportsMeal: boolean;
  note: string | null;
  status: VenueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VenueListResponse {
  data: VenueResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface VenueStatsResponse {
  totalVenues: number;
  activeVenues: number;
  maintenanceVenues: number;
  disabledVenues: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
}

// ================================
// API 函数
// ================================

/**
 * 获取场地列表
 */
export const listVenues = async (query?: ListVenuesQuery): Promise<VenueListResponse> => {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.supportsMeal !== undefined) params.append('supportsMeal', String(query.supportsMeal));
  if (query?.search) params.append('search', query.search);
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));

  const response = await apiClient.get<VenueListResponse>(`/venues?${params.toString()}`);
  return response.data;
};

/**
 * 获取可用场地列表
 */
export const getActiveVenues = async (): Promise<{ data: VenueResponse[] }> => {
  const response = await apiClient.get<{ data: VenueResponse[] }>('/venues/active');
  return response.data;
};

/**
 * 获取场地详情
 */
export const getVenueById = async (venueId: string): Promise<VenueResponse> => {
  const response = await apiClient.get<VenueResponse>(`/venues/${venueId}`);
  return response.data;
};

/**
 * 创建场地（仅管理员）
 */
export const createVenue = async (input: CreateVenueInput): Promise<VenueResponse> => {
  const response = await apiClient.post<VenueResponse>('/venues', input);
  return response.data;
};

/**
 * 更新场地（仅管理员）
 */
export const updateVenue = async (
  venueId: string,
  input: UpdateVenueInput
): Promise<VenueResponse> => {
  const response = await apiClient.patch<VenueResponse>(`/venues/${venueId}`, input);
  return response.data;
};

/**
 * 停用场地（仅管理员）
 */
export const disableVenue = async (venueId: string): Promise<VenueResponse> => {
  const response = await apiClient.post<VenueResponse>(`/venues/${venueId}/disable`);
  return response.data;
};

/**
 * 启用场地（仅管理员）
 */
export const enableVenue = async (venueId: string): Promise<VenueResponse> => {
  const response = await apiClient.post<VenueResponse>(`/venues/${venueId}/enable`);
  return response.data;
};

/**
 * 设置场地维护状态（仅管理员）
 */
export const setVenueMaintenance = async (venueId: string): Promise<VenueResponse> => {
  const response = await apiClient.post<VenueResponse>(`/venues/${venueId}/maintenance`);
  return response.data;
};

/**
 * 获取场地统计（仅管理员）
 */
export const getVenueStats = async (): Promise<VenueStatsResponse> => {
  const response = await apiClient.get<VenueStatsResponse>('/venues/stats');
  return response.data;
};

// ================================
// 对象式 API（统一风格）
// ================================

export const venuesApi = {
  list: listVenues,
  getActive: getActiveVenues,
  getById: getVenueById,
  create: createVenue,
  update: updateVenue,
  disable: disableVenue,
  enable: enableVenue,
  setMaintenance: setVenueMaintenance,
  getStats: getVenueStats,
};

// 类型别名（兼容旧代码）
export type Venue = VenueResponse;

