/**
 * Token 发放任务 API 客户端 - Node 5
 * PRD 23.5: TokenGrantTask API
 * 扩展: 支持线下到访来源
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type TokenGrantTaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskSource = 'MEETING_GUEST' | 'ONSITE_VISIT';
export type GuestCategory = 'PUBLIC_CO_DMHG' | 'FIN_EXEC' | 'PUBLIC_CHAIRMAN_CONTROLLER' | 'MINISTRY_LEADER' | 'OTHER';

export const TASK_SOURCE_LABELS: Record<TaskSource, string> = {
  'MEETING_GUEST': '座谈会嘉宾',
  'ONSITE_VISIT': '线下到访',
};

export interface ApproveTaskInput {
  amountOverride?: number;
  comment?: string;
}

export interface RejectTaskInput {
  comment?: string;
}

export interface ListGrantTasksQuery {
  status?: TokenGrantTaskStatus;
  taskSource?: TaskSource;
  meetingId?: string;
  onsiteVisitId?: string;
  inviterId?: string;
  guestCategory?: GuestCategory;
  page?: number;
  pageSize?: number;
}

// 历史访问提醒
export interface GuestHistoryWarning {
  type: 'SAME_PERSON' | 'SAME_ORG';
  message: string;
  count: number;
  lastVisitDate?: string;
}

export interface GrantTaskResponse {
  id: string;
  taskSource: TaskSource;
  // 座谈会嘉宾信息（可选）
  meeting: {
    id: string;
    topic: string;
    startTime: string;
    endTime: string;
    venue: {
      id: string;
      name: string;
    } | null;
  } | null;
  guest: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
  } | null;
  // 线下到访信息（可选）
  onsiteVisit: {
    id: string;
    name: string;
    organization: string;
    title: string;
    guestCategory: string;
    visitDate: string;
    venue: {
      id: string;
      name: string;
    } | null;
  } | null;
  inviter: {
    id: string;
    name: string;
    avatar: string | null;
  };
  status: TokenGrantTaskStatus;
  defaultAmount: number;
  finalAmount: number | null;
  admin: {
    id: string;
    name: string;
  } | null;
  adminComment: string | null;
  decidedAt: string | null;
  tokenTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  // 历史访问提醒
  historyWarnings?: GuestHistoryWarning[];
}

export interface GrantTaskListResponse {
  data: GrantTaskResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GrantTaskStatsResponse {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalGrantedAmount: number;
  thisMonthGrantedAmount: number;
}

// ================================
// API 函数
// ================================

/**
 * 获取发放任务列表（仅管理员）
 */
export const listGrantTasks = async (
  query?: ListGrantTasksQuery
): Promise<GrantTaskListResponse> => {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.taskSource) params.append('taskSource', query.taskSource);
  if (query?.meetingId) params.append('meetingId', query.meetingId);
  if (query?.onsiteVisitId) params.append('onsiteVisitId', query.onsiteVisitId);
  if (query?.inviterId) params.append('inviterId', query.inviterId);
  if (query?.guestCategory) params.append('guestCategory', query.guestCategory);
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));

  const response = await apiClient.get<GrantTaskListResponse>(
    `/admin/token-grant-tasks?${params.toString()}`
  );
  return response.data;
};

/**
 * 获取发放任务详情（仅管理员）
 */
export const getGrantTaskById = async (taskId: string): Promise<GrantTaskResponse> => {
  const response = await apiClient.get<GrantTaskResponse>(`/admin/token-grant-tasks/${taskId}`);
  return response.data;
};

/**
 * 审核通过发放任务（仅管理员）
 */
export const approveTask = async (
  taskId: string,
  input?: ApproveTaskInput
): Promise<GrantTaskResponse> => {
  const response = await apiClient.post<GrantTaskResponse>(
    `/admin/token-grant-tasks/${taskId}/approve`,
    input || {}
  );
  return response.data;
};

/**
 * 拒绝发放任务（仅管理员）
 */
export const rejectTask = async (
  taskId: string,
  input?: RejectTaskInput
): Promise<GrantTaskResponse> => {
  const response = await apiClient.post<GrantTaskResponse>(
    `/admin/token-grant-tasks/${taskId}/reject`,
    input || {}
  );
  return response.data;
};

/**
 * 获取发放任务统计（仅管理员）
 */
export const getGrantTaskStats = async (): Promise<GrantTaskStatsResponse> => {
  const response = await apiClient.get<GrantTaskStatsResponse>('/admin/token-grant-tasks/stats');
  return response.data;
};

/**
 * 获取我的发放任务（作为邀请人）
 */
export const getMyGrantTasks = async (
  status?: TokenGrantTaskStatus
): Promise<{ data: GrantTaskResponse[] }> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const response = await apiClient.get<{ data: GrantTaskResponse[] }>(
    `/admin/token-grant-tasks/my?${params.toString()}`
  );
  return response.data;
};

