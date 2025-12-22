/**
 * 公告管理 API - Node 9
 * PRD 6.12: 公告管理模块
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface AnnouncementResponse {
  id: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  summary?: string | null;
  content: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  isPinned: boolean;
  attachments: string[];
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListResponse {
  data: AnnouncementResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  attachments?: string[];
  visibilityScopeType?: 'ALL' | 'ROLE_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  attachments?: string[];
}

export interface ListAnnouncementsQuery {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// ================================
// 公开接口（已认证用户）
// ================================

/**
 * 获取用户可见的公告列表
 */
export const listAnnouncements = async (
  query?: ListAnnouncementsQuery
): Promise<AnnouncementListResponse> => {
  const response = await apiClient.get('/announcements', { params: query });
  return response.data;
};

/**
 * 获取公告详情
 */
export const getAnnouncementById = async (
  id: string
): Promise<AnnouncementResponse> => {
  const response = await apiClient.get(`/announcements/${id}`);
  return response.data;
};

// ================================
// 管理员接口
// ================================

/**
 * 获取所有公告列表（管理员）
 */
export const listAllAnnouncements = async (
  query?: ListAnnouncementsQuery
): Promise<AnnouncementListResponse> => {
  const response = await apiClient.get('/announcements/admin/list', { params: query });
  return response.data;
};

/**
 * 创建公告（管理员）
 */
export const createAnnouncement = async (
  input: CreateAnnouncementInput
): Promise<AnnouncementResponse> => {
  const response = await apiClient.post('/announcements', input);
  return response.data;
};

/**
 * 更新公告（管理员）
 */
export const updateAnnouncement = async (
  id: string,
  input: UpdateAnnouncementInput
): Promise<AnnouncementResponse> => {
  const response = await apiClient.patch(`/announcements/${id}`, input);
  return response.data;
};

/**
 * 删除公告（管理员）
 */
export const deleteAnnouncement = async (id: string): Promise<void> => {
  await apiClient.delete(`/announcements/${id}`);
};

// ================================
// 对象式 API（统一风格）
// ================================

export const announcementsApi = {
  listAnnouncements: (query?: ListAnnouncementsQuery) =>
    apiClient.get<{ items: AnnouncementResponse[]; total: number }>('/announcements', { params: query }),
  
  // 别名
  list: async (query?: ListAnnouncementsQuery) => {
    const response = await apiClient.get<{ success: boolean; data: AnnouncementResponse[]; pagination: any }>('/announcements', { params: query });
    return response.data;
  },
  
  getAnnouncement: (id: string) =>
    apiClient.get<AnnouncementResponse>(`/announcements/${id}`),
  
  createAnnouncement: (input: CreateAnnouncementInput) =>
    apiClient.post<AnnouncementResponse>('/announcements', input),
  
  // 别名
  create: async (input: CreateAnnouncementInput) => {
    const response = await apiClient.post<{ success: boolean; data: AnnouncementResponse }>('/announcements', input);
    return response.data.data;
  },
  
  updateAnnouncement: (id: string, input: UpdateAnnouncementInput) =>
    apiClient.patch<AnnouncementResponse>(`/announcements/${id}`, input),
  
  // 别名
  update: async (id: string, input: UpdateAnnouncementInput) => {
    const response = await apiClient.patch<{ success: boolean; data: AnnouncementResponse }>(`/announcements/${id}`, input);
    return response.data.data;
  },
  
  deleteAnnouncement: (id: string) =>
    apiClient.delete<void>(`/announcements/${id}`),
  
  // 别名
  delete: async (id: string) => {
    await apiClient.delete<{ success: boolean }>(`/announcements/${id}`);
  },
};

