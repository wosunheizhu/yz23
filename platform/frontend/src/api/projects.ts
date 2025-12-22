/**
 * 项目 API 客户端
 * 元征 · 合伙人赋能平台
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface ProjectListItem {
  id: string;
  name: string;
  businessType: string;
  industry: string | null;
  region: string | null;
  reviewStatus: string;
  businessStatus: string;
  createdBy: {
    id: string;
    name: string;
  };
  leadersCount: number;
  membersCount: number;
  createdAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  description: string | null;
  leaders: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    joinedAt: string;
  }>;
  shares: Array<{
    holderName: string;
    holderId: string | null;
    percentage: number;
    note: string | null;
  }>;
  linkedProjects: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  demandsCount: number;
  eventsCount: number;
}

export interface ProjectEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  payload: any;
  createdAt: string;
  createdById: string | null;
  createdByName: string | null;
  createdByAvatar: string | null;
}

export interface ProjectStats {
  total: number;
  byReviewStatus: {
    PENDING_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
  };
  byBusinessStatus: {
    ONGOING: number;
    PAUSED: number;
    COMPLETED: number;
    ABANDONED: number;
  };
}

export interface CreateProjectDto {
  name: string;
  businessType: string;
  industry?: string;
  region?: string;
  description?: string;
  leaders: string[];
  members?: string[];
  shares: Array<{
    holderName: string;
    holderId?: string;
    percentage: number;
    note?: string;
  }>;
  businessStatus?: string;
  visibilityScopeType: string;
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
  linkedProjectIds?: string[];
  networkResourceIds?: string[];
}

export interface ListProjectsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  businessType?: string;
  reviewStatus?: string;
  businessStatus?: string;
  industry?: string;
  myProjects?: boolean;
  sort?: string;
}

// ================================
// API 函数
// ================================

/**
 * 获取项目列表
 */
export const getProjects = async (params?: ListProjectsParams) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ProjectListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>('/projects', { params });
  return response.data;
};

/**
 * 获取项目详情
 */
export const getProjectById = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ProjectDetail;
  }>(`/projects/${id}`);
  return response.data.data;
};

/**
 * 创建项目
 */
export const createProject = async (data: CreateProjectDto) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ProjectDetail;
  }>('/projects', data);
  return response.data.data;
};

/**
 * 更新项目
 */
export const updateProject = async (id: string, data: Partial<CreateProjectDto>) => {
  const response = await apiClient.put<{
    success: boolean;
    data: ProjectDetail;
  }>(`/projects/${id}`, data);
  return response.data.data;
};

/**
 * 审核项目（管理员）
 */
export const reviewProject = async (id: string, action: 'approve' | 'reject', reason?: string) => {
  const response = await apiClient.post<{
    success: boolean;
    data: ProjectDetail;
  }>(`/projects/${id}/review`, { action, reason });
  return response.data.data;
};

/**
 * 获取项目时间线
 */
export const getProjectEvents = async (id: string) => {
  const response = await apiClient.get<{
    success: boolean;
    data: ProjectEvent[];
  }>(`/projects/${id}/events`);
  return response.data.data;
};

/**
 * 获取待审核项目（管理员）
 */
export const getPendingProjects = async () => {
  const response = await apiClient.get<{
    success: boolean;
    data: ProjectListItem[];
  }>('/projects/pending');
  return response.data.data;
};

/**
 * 获取项目统计（管理员）
 */
export const getProjectStats = async () => {
  const response = await apiClient.get<{
    success: boolean;
    data: ProjectStats;
  }>('/projects/stats');
  return response.data.data;
};

// ================================
// 加入项目申请 (PRD 6.3.4)
// ================================

export interface JoinProjectDto {
  role: 'LEADER' | 'MEMBER';
  responsibility: string;
  intendedSharePercentage: number;
  note?: string;
}

export interface JoinRequest {
  id: string;
  projectId: string;
  projectName: string;
  user: { id: string; name: string; avatarUrl?: string };
  role: string;
  responsibility: string;
  intendedSharePercentage: number;
  note: string | null;
  status: string;
  createdAt: string;
}

/**
 * 申请加入项目
 */
export const requestJoinProject = async (projectId: string, data: JoinProjectDto) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/${projectId}/join`,
    data
  );
  return response.data.data;
};

/**
 * 获取项目的加入申请列表
 */
export const getJoinRequests = async (projectId: string) => {
  const response = await apiClient.get<{ success: boolean; data: JoinRequest[] }>(
    `/projects/${projectId}/join-requests`
  );
  return response.data.data;
};

/**
 * 审批加入申请
 */
export const reviewJoinRequest = async (
  requestId: string,
  action: 'approve' | 'reject',
  actualSharePercentage?: number,
  reason?: string
) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/join-requests/${requestId}/review`,
    { action, actualSharePercentage, reason }
  );
  return response.data.data;
};

// ================================
// 项目进程记录 (PRD 6.3.8)
// ================================

export interface CreateProjectEventDto {
  title: string;
  description: string;
  eventType?: 'MILESTONE_ADDED' | 'NOTE';
}

export interface CorrectEventDto {
  correctedEventId: string;
  correctionNote: string;
}

/**
 * 新建项目进程记录
 */
export const addProjectEvent = async (projectId: string, data: CreateProjectEventDto) => {
  const response = await apiClient.post<{ success: boolean; data: ProjectEvent }>(
    `/projects/${projectId}/events`,
    data
  );
  return response.data.data;
};

/**
 * 添加更正事件
 */
export const correctProjectEvent = async (projectId: string, data: CorrectEventDto) => {
  const response = await apiClient.post<{ success: boolean; data: ProjectEvent }>(
    `/projects/${projectId}/events/correct`,
    data
  );
  return response.data.data;
};

// ================================
// 成员管理
// ================================

export interface AddMemberDto {
  userId: string;
  role: 'LEADER' | 'MEMBER';
  responsibility?: string;
  intendedSharePercentage?: number;
}

/**
 * 直接添加项目成员（管理员/负责人操作）
 */
export const addMember = async (projectId: string, data: AddMemberDto) => {
  const response = await apiClient.post<{ success: boolean; data: { success: boolean; memberId: string } }>(
    `/projects/${projectId}/members/add`,
    data
  );
  return response.data.data;
};

/**
 * 移除项目成员
 */
export const removeMember = async (projectId: string, userId: string, reason?: string) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/${projectId}/members/remove`,
    { userId, reason }
  );
  return response.data.data;
};

/**
 * 更新成员角色
 */
export const updateMemberRole = async (
  projectId: string,
  userId: string,
  role: 'LEADER' | 'MEMBER' | 'RECORDER'
) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/${projectId}/members/role`,
    { userId, role }
  );
  return response.data.data;
};

// ================================
// 股权结构调整（管理员）
// ================================

export interface AdjustSharesDto {
  shares: Array<{
    holderName: string;
    holderId?: string;
    percentage: number;
    note?: string;
  }>;
  reason: string;
}

/**
 * 调整股权结构（管理员或项目负责人）
 */
export const adjustShares = async (projectId: string, data: AdjustSharesDto) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/${projectId}/shares`,
    data
  );
  return response.data.data;
};

// ================================
// 业务状态变更
// ================================

/**
 * 变更项目业务状态
 */
export const changeBusinessStatus = async (
  projectId: string,
  businessStatus: 'ONGOING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED',
  reason?: string
) => {
  const response = await apiClient.post<{ success: boolean; data: any }>(
    `/projects/${projectId}/status`,
    { businessStatus, reason }
  );
  return response.data.data;
};

// 业务类型映射
export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  AGREEMENT_TRANSFER: '协议转让',
  MERGER_ACQUISITION: '并购重组',
  INDUSTRY_ENABLEMENT: '产业赋能',
  DEBT_BUSINESS: '债权业务',
  OTHER: '其他',
};

// 审核状态映射
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

// 业务状态映射
export const BUSINESS_STATUS_LABELS: Record<string, string> = {
  ONGOING: '进行中',
  PAUSED: '暂停',
  COMPLETED: '已完成',
  ABANDONED: '废弃',
};

// 审核状态颜色
export const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

// 业务状态颜色
export const BUSINESS_STATUS_COLORS: Record<string, string> = {
  ONGOING: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ABANDONED: 'bg-red-100 text-red-800',
};

// ================================
// 对象式 API（统一风格）
// ================================

export const projectsApi = {
  list: getProjects,
  listProjects: getProjects,
  getById: getProjectById,
  create: createProject,
  update: updateProject,
  getEvents: getProjectEvents,
  addEvent: addProjectEvent,
  correctEvent: correctProjectEvent,
  review: reviewProject,
  getStats: getProjectStats,
  requestJoin: requestJoinProject,
  getJoinRequests,
  reviewJoinRequest,
  adjustShares,
  removeMember,
  updateMemberRole,
  changeBusinessStatus,
};

