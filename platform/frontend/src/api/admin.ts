/**
 * 管理员控制台 API - Node 9
 * PRD 22: 管理员控制台（v3 增量）
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface DashboardStatsResponse {
  projects: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
  demands: {
    total: number;
    open: number;
    responseCount: number;
  };
  tokens: {
    totalCirculation: number;
    pendingTransfers: number;
    pendingGrants: number;
  };
  venues: {
    total: number;
    active: number;
    todayBookings: number;
    weekBookings: number;
  };
  meetings: {
    total: number;
    upcoming: number;
    todayCount: number;
  };
  notifications: {
    pendingEmails: number;
    failedEmails: number;
    todaySent: number;
  };
  users: {
    total: number;
    activeThisWeek: number;
  };
}

export interface QuickActionsResponse {
  pendingProjects: number;
  pendingTransfers: number;
  pendingGrants: number;
  pendingArbitrations: number;
  failedEmails: number;
  pendingFeedbacks: number;
  total: number;
}

export interface RecentActivityResponse {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
  createdAt: string;
}

export interface TodayScheduleItem {
  type: 'MEETING' | 'BOOKING';
  id: string;
  title: string;
  venueName?: string;
  ownerName?: string;
  startTime: string;
  endTime: string;
  status: string;
  hasMeal?: boolean;
}

export interface TokenOverviewResponse {
  totalBalance: number;
  totalAccounts: number;
  todayTransactions: number;
  weekTransactions: number;
  pendingTransfers: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    fromUserName?: string;
    toUserName?: string;
    status: string;
    createdAt: string;
  }>;
}

export interface NotificationHealthResponse {
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  pending: number;
  failed: number;
  sentLastHour: number;
  sentLastDay: number;
  successRate: number;
  oldestPendingAt: string | null;
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ListAuditLogsQuery {
  userId?: string;
  action?: string;
  objectType?: string;
  objectId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface VenueOccupancyResponse {
  venueId: string;
  venueName: string;
  period: 'week' | 'month';
  totalSlots: number;
  bookedSlots: number;
  occupancyRate: number;
  bookingsByDay: Array<{
    date: string;
    count: number;
    hours: number;
  }>;
}

export interface VenueOccupancyQuery {
  venueId?: string;
  period?: 'week' | 'month';
  from?: string;
  to?: string;
}

export interface AdminBookingResponse {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  ownerUserId: string;
  ownerName: string;
  startTime: string;
  endTime: string;
  status: string;
  hasMeal: boolean;
  mealType: string | null;
  mealStartTime: string | null;
  mealEndTime: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminBookingListResponse {
  data: AdminBookingResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminBookingListQuery {
  venueId?: string;
  date?: string;
  ownerId?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'FINISHED';
  hasMeal?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface PendingProjectResponse {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string;
  status: string;
  createdAt: string;
}

export interface PendingArbitrationResponse {
  id: string;
  demandId: string;
  demandTitle: string;
  demandOwnerId?: string;
  demandOwnerName?: string;
  responderId: string;
  responderName: string;
  status: string;
  modifyStatus: string | null;
  abandonStatus: string | null;
  modifyRequestReason: string | null;
  abandonRequestReason: string | null;
  updatedAt: string;
}

export interface SystemConfigResponse {
  tokenInitialAmounts: {
    PARTNER: number;
    RESOURCE_PARTNER: number;
    LIMITED_PARTNER: number;
  };
  grantDefaults: {
    GOVERNMENT: number;
    ENTERPRISE: number;
    INVESTMENT: number;
    OTHER: number;
  };
  emailBatching: {
    dmBatchMinutes: number;
    communityBatchMinutes: number;
    projectBatchMinutes: number;
  };
  // 自助注册邀请码
  selfRegistrationInviteCode: string;
  allowSelfRegistration: boolean;
}

// ================================
// 仪表盘 API
// ================================

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const response = await apiClient.get('/admin/dashboard/stats');
  return response.data.data || response.data;
};

export const getQuickActions = async (): Promise<QuickActionsResponse> => {
  const response = await apiClient.get('/admin/dashboard/quick-actions');
  return response.data.data || response.data;
};

export const getRecentActivities = async (): Promise<RecentActivityResponse[]> => {
  const response = await apiClient.get('/admin/dashboard/recent-activities');
  return response.data;
};

export const getTodaySchedule = async (): Promise<TodayScheduleItem[]> => {
  const response = await apiClient.get('/admin/dashboard/today-schedule');
  return response.data;
};

export const getTokenOverview = async (): Promise<TokenOverviewResponse> => {
  const response = await apiClient.get('/admin/dashboard/token-overview');
  return response.data;
};

export const getNotificationHealth = async (): Promise<NotificationHealthResponse> => {
  const response = await apiClient.get('/admin/dashboard/notification-health');
  return response.data;
};

// ================================
// 审计日志 API
// ================================

export const listAuditLogs = async (
  query?: ListAuditLogsQuery
): Promise<AuditLogListResponse> => {
  const response = await apiClient.get('/admin/audit-logs', { params: query });
  return response.data;
};

// ================================
// 场地管理 API
// ================================

export const getVenueOccupancy = async (
  query?: VenueOccupancyQuery
): Promise<VenueOccupancyResponse[]> => {
  const response = await apiClient.get('/admin/venues/occupancy', { params: query });
  return response.data;
};

// ================================
// 预约管理 API
// ================================

export const listAdminBookings = async (
  query?: AdminBookingListQuery
): Promise<AdminBookingListResponse> => {
  const response = await apiClient.get('/admin/bookings', { params: query });
  return response.data;
};

/**
 * 导出预约列表为 CSV
 */
export const exportBookingsToCSV = async (
  query?: AdminBookingListQuery
): Promise<Blob> => {
  const response = await apiClient.get('/admin/bookings/export', {
    params: query,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * 下载预约 CSV 文件
 */
export const downloadBookingsCSV = async (query?: AdminBookingListQuery): Promise<void> => {
  const blob = await exportBookingsToCSV(query);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ================================
// 项目审核 API
// ================================

export const listPendingProjects = async (
  page?: number,
  pageSize?: number
): Promise<{ data: PendingProjectResponse[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> => {
  const response = await apiClient.get('/admin/projects/pending', {
    params: { page, pageSize },
  });
  return response.data;
};

export const reviewProject = async (
  projectId: string,
  approved: boolean,
  comment?: string
): Promise<void> => {
  await apiClient.post(`/admin/projects/${projectId}/review`, {
    approved,
    comment,
  });
};

// ================================
// 响应裁决 API
// ================================

export const listPendingArbitrations = async (
  page?: number,
  pageSize?: number
): Promise<{ data: PendingArbitrationResponse[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> => {
  const response = await apiClient.get('/admin/responses/pending-arbitration', {
    params: { page, pageSize },
  });
  return response.data;
};

export const arbitrateResponse = async (
  responseId: string,
  decision: 'APPROVE_MODIFY' | 'REJECT_MODIFY' | 'APPROVE_ABANDON' | 'REJECT_ABANDON',
  comment?: string
): Promise<void> => {
  await apiClient.post(`/admin/responses/${responseId}/arbitrate`, {
    decision,
    comment,
  });
};

// ================================
// 系统配置 API
// ================================

export const getSystemConfig = async (): Promise<SystemConfigResponse> => {
  const response = await apiClient.get('/admin/config');
  return response.data;
};

export const updateSystemConfig = async (
  config: Partial<{
    tokenInitialAmounts: Partial<{ PARTNER: number; RESOURCE_PARTNER: number; LIMITED_PARTNER: number }>;
    grantDefaults: Partial<{ GOVERNMENT: number; ENTERPRISE: number; INVESTMENT: number; OTHER: number }>;
    selfRegistrationInviteCode: string;
    allowSelfRegistration: boolean;
  }>
): Promise<SystemConfigResponse> => {
  const response = await apiClient.put('/admin/config', config);
  return response.data;
};

// ================================
// 导出 adminApi 对象
// ================================
export const adminApi = {
  getDashboardStats,
  getQuickActions,
  getRecentActivities,
  getTodaySchedule,
  getTokenOverview,
  getNotificationHealth,
  listAuditLogs,
  getVenueOccupancy,
  listAdminBookings,
  exportBookingsToCSV,
  downloadBookingsCSV,
  listPendingProjects,
  listPendingArbitrations,
  getSystemConfig,
  updateSystemConfig,
};

