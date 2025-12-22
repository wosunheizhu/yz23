/**
 * 线下到访记录 API
 * 用户直接记录邀请到公司线下的人员
 * 可作为业绩申请Token奖励
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export const GuestCategory = {
  PUBLIC_CO_DMHG: 'PUBLIC_CO_DMHG',
  FIN_EXEC: 'FIN_EXEC',
  PUBLIC_CHAIRMAN_CONTROLLER: 'PUBLIC_CHAIRMAN_CONTROLLER',
  DEPT_LEADER: 'DEPT_LEADER',           // 处级领导
  BUREAU_LEADER: 'BUREAU_LEADER',       // 厅级领导
  MINISTRY_LEADER: 'MINISTRY_LEADER',
  OTHER: 'OTHER',
} as const;

export type GuestCategory = (typeof GuestCategory)[keyof typeof GuestCategory];

// 嘉宾分类对应的默认Token额度（仅供管理员审核时参考，不在表单中显示）
export const GUEST_CATEGORY_DEFAULT_AMOUNT: Record<GuestCategory, number> = {
  [GuestCategory.PUBLIC_CO_DMHG]: 500,
  [GuestCategory.FIN_EXEC]: 500,
  [GuestCategory.PUBLIC_CHAIRMAN_CONTROLLER]: 1000,
  [GuestCategory.DEPT_LEADER]: 500,     // 处级领导
  [GuestCategory.BUREAU_LEADER]: 1000,  // 厅级领导
  [GuestCategory.MINISTRY_LEADER]: 2000,
  [GuestCategory.OTHER]: 0,
};

export const GUEST_CATEGORY_LABELS: Record<GuestCategory, string> = {
  [GuestCategory.PUBLIC_CO_DMHG]: '上市公司董监高',
  [GuestCategory.FIN_EXEC]: '金融从业高管',
  [GuestCategory.PUBLIC_CHAIRMAN_CONTROLLER]: '上市公司董事长/实控人',
  [GuestCategory.DEPT_LEADER]: '处级领导',
  [GuestCategory.BUREAU_LEADER]: '厅级领导',
  [GuestCategory.MINISTRY_LEADER]: '部委部级领导',
  [GuestCategory.OTHER]: '其他',
};

export interface CreateOnsiteVisitInput {
  name: string;
  organization: string;
  title: string;
  contact?: string;
  purpose?: string;
  note?: string;
  visitDate: string;
  guestCategory: GuestCategory;
  venueId?: string;
}

export interface UpdateOnsiteVisitInput {
  name?: string;
  organization?: string;
  title?: string;
  contact?: string | null;
  purpose?: string | null;
  note?: string | null;
  visitDate?: string;
  guestCategory?: GuestCategory;
  venueId?: string | null;
}

export interface OnsiteVisitResponse {
  id: string;
  name: string;
  organization: string;
  title: string;
  contact: string | null;
  purpose: string | null;
  note: string | null;
  visitDate: string;
  guestCategory: GuestCategory;
  defaultGrantAmount: number;
  finalGrantAmount: number | null;
  inviter: {
    id: string;
    name: string;
    avatar: string | null;
  };
  venue: {
    id: string;
    name: string;
  } | null;
  grantTask: {
    id: string;
    status: string;
    finalAmount: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnsiteVisitListResponse {
  data: OnsiteVisitResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OnsiteVisitStatsResponse {
  totalVisits: number;
  pendingGrants: number;
  approvedGrants: number;
  totalGrantedAmount: number;
  thisMonthVisits: number;
}

export interface ListOnsiteVisitsParams {
  search?: string;
  guestCategory?: GuestCategory;
  inviterId?: string;
  fromDate?: string;
  toDate?: string;
  hasGrantTask?: boolean;
  page?: number;
  pageSize?: number;
}

// ================================
// API 函数
// ================================

/**
 * 创建线下到访记录
 */
export const createOnsiteVisit = async (
  input: CreateOnsiteVisitInput
): Promise<OnsiteVisitResponse> => {
  const response = await apiClient.post<OnsiteVisitResponse>('/onsite-visits', input);
  return response.data;
};

/**
 * 获取线下到访记录详情
 */
export const getOnsiteVisit = async (id: string): Promise<OnsiteVisitResponse> => {
  const response = await apiClient.get<OnsiteVisitResponse>(`/onsite-visits/${id}`);
  return response.data;
};

/**
 * 更新线下到访记录
 */
export const updateOnsiteVisit = async (
  id: string,
  input: UpdateOnsiteVisitInput
): Promise<OnsiteVisitResponse> => {
  const response = await apiClient.patch<OnsiteVisitResponse>(`/onsite-visits/${id}`, input);
  return response.data;
};

/**
 * 删除线下到访记录
 */
export const deleteOnsiteVisit = async (id: string): Promise<void> => {
  await apiClient.delete(`/onsite-visits/${id}`);
};

/**
 * 获取线下到访记录列表
 */
export const listOnsiteVisits = async (
  params?: ListOnsiteVisitsParams
): Promise<OnsiteVisitListResponse> => {
  const response = await apiClient.get<OnsiteVisitListResponse>('/onsite-visits', {
    params: {
      ...params,
      hasGrantTask: params?.hasGrantTask?.toString(),
    },
  });
  return response.data;
};

/**
 * 获取我的线下到访记录
 */
export const getMyOnsiteVisits = async (): Promise<OnsiteVisitResponse[]> => {
  const response = await apiClient.get<OnsiteVisitResponse[]>('/onsite-visits/my');
  return response.data;
};

/**
 * 获取线下到访统计
 */
export const getOnsiteVisitStats = async (): Promise<OnsiteVisitStatsResponse> => {
  const response = await apiClient.get<OnsiteVisitStatsResponse>('/onsite-visits/stats');
  return response.data;
};

export const onsiteVisitsApi = {
  create: createOnsiteVisit,
  get: getOnsiteVisit,
  update: updateOnsiteVisit,
  delete: deleteOnsiteVisit,
  list: listOnsiteVisits,
  getMy: getMyOnsiteVisits,
  getStats: getOnsiteVisitStats,
};

export default onsiteVisitsApi;

