/**
 * 公司座谈会 API 客户端 - Node 5
 * PRD 23.4: CompanyMeeting（公司座谈会）API
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type MeetingKind = 'DAILY' | 'COMPANY';
export type MeetingLevel = 'INTERNAL' | 'EXTERNAL';
export type ConfidentialityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MeetingStatus = 'SCHEDULED' | 'FINISHED' | 'CANCELLED';
export type ParticipantRole = 'HOST' | 'ATTENDEE' | 'OPTIONAL';
export type AttendanceStatus = 'INVITED' | 'ATTENDING' | 'DECLINED' | 'NO_SHOW';
export type GuestCategory = 'PUBLIC_CO_DMHG' | 'FIN_EXEC' | 'PUBLIC_CHAIRMAN_CONTROLLER' | 'MINISTRY_LEADER' | 'OTHER';
export type VisibilityScopeType = 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';

export interface CreateMeetingInput {
  topic: string;
  meetingKind?: MeetingKind;
  meetingLevel?: MeetingLevel;
  confidentiality?: ConfidentialityLevel;
  venueId?: string;
  location?: string;
  isOffline?: boolean;
  onlineLink?: string;
  startTime: string;
  endTime: string;
  projectId?: string;
  visibilityScopeType?: VisibilityScopeType;
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
  participants?: Array<{
    userId: string;
    role: ParticipantRole;
  }>;
}

export interface UpdateMeetingInput {
  topic?: string;
  meetingLevel?: MeetingLevel;
  confidentiality?: ConfidentialityLevel;
  venueId?: string | null;
  location?: string | null;
  isOffline?: boolean;
  onlineLink?: string | null;
  startTime?: string;
  endTime?: string;
  projectId?: string | null;
  visibilityScopeType?: VisibilityScopeType;
  visibilityMinRoleLevel?: number | null;
  visibilityUserIds?: string[];
}

export interface AddParticipantInput {
  userId: string;
  role?: ParticipantRole;
}

export interface UpdateParticipantInput {
  role?: ParticipantRole;
  attendanceStatus?: AttendanceStatus;
}

export interface AddGuestInput {
  name: string;
  organization: string;
  title: string;
  contact?: string;
  note?: string;
  guestCategory?: GuestCategory;
  invitedByUserId?: string;
}

export interface UpdateGuestInput {
  name?: string;
  organization?: string;
  title?: string;
  contact?: string | null;
  note?: string | null;
  guestCategory?: GuestCategory;
}

export interface UpdateMinutesInput {
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
}

export interface ListMeetingsQuery {
  meetingKind?: MeetingKind;
  from?: string;
  to?: string;
  projectId?: string;
  status?: MeetingStatus;
  venueId?: string;
  myMeetings?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ParticipantResponse {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  role: string;
  attendanceStatus: string;
}

export interface GuestResponse {
  id: string;
  name: string;
  organization: string;
  title: string;
  contact: string | null;
  note: string | null;
  guestCategory: string;
  defaultGrantAmount: number;
  finalGrantAmount: number | null;
  invitedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface MinutesResponse {
  id: string;
  content: string;
  attachments: Array<{
    name: string;
    url: string;
    type?: string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingResponse {
  id: string;
  topic: string;
  meetingKind: string;
  meetingLevel: string;
  confidentiality: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  location: string | null;
  isOffline: boolean;
  onlineLink: string | null;
  startTime: string;
  endTime: string;
  project: {
    id: string;
    name: string;
  } | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  status: string;
  participantCount: number;
  guestCount: number;
  hasMinutes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDetailResponse extends MeetingResponse {
  participants: ParticipantResponse[];
  guests: GuestResponse[];
  minutes: MinutesResponse | null;
}

export interface MeetingListResponse {
  data: MeetingResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ================================
// API 函数
// ================================

/**
 * 获取会议列表
 */
export const listMeetings = async (query?: ListMeetingsQuery): Promise<MeetingListResponse> => {
  const params = new URLSearchParams();
  if (query?.meetingKind) params.append('meetingKind', query.meetingKind);
  if (query?.from) params.append('from', query.from);
  if (query?.to) params.append('to', query.to);
  if (query?.projectId) params.append('projectId', query.projectId);
  if (query?.status) params.append('status', query.status);
  if (query?.venueId) params.append('venueId', query.venueId);
  if (query?.myMeetings) params.append('myMeetings', 'true');
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));

  const response = await apiClient.get<MeetingListResponse>(`/company-meetings?${params.toString()}`);
  return response.data;
};

/**
 * 获取会议详情
 */
export const getMeetingById = async (meetingId: string): Promise<MeetingDetailResponse> => {
  const response = await apiClient.get<MeetingDetailResponse>(`/company-meetings/${meetingId}`);
  return response.data;
};

/**
 * 创建会议
 */
export const createMeeting = async (input: CreateMeetingInput): Promise<MeetingDetailResponse> => {
  const response = await apiClient.post<MeetingDetailResponse>('/company-meetings', input);
  return response.data;
};

/**
 * 更新会议
 */
export const updateMeeting = async (
  meetingId: string,
  input: UpdateMeetingInput
): Promise<MeetingDetailResponse> => {
  const response = await apiClient.patch<MeetingDetailResponse>(`/company-meetings/${meetingId}`, input);
  return response.data;
};

/**
 * 取消会议
 */
export const cancelMeeting = async (
  meetingId: string,
  reason?: string
): Promise<MeetingDetailResponse> => {
  const response = await apiClient.post<MeetingDetailResponse>(
    `/company-meetings/${meetingId}/cancel`,
    { reason }
  );
  return response.data;
};

// PRD 30.1: 嘉宾补录不完整时的返回结构
export interface IncompleteGuestInfo {
  guestId: string;
  guestName: string;
  missingFields: ('invitedBy' | 'organization' | 'title' | 'guestCategory')[];
}

export interface FinishMeetingResponse {
  meeting: MeetingDetailResponse;
  grantTasksCreated: number;
  incompleteGuests: IncompleteGuestInfo[];
}

/**
 * 结束会议（触发 Token 发放任务生成）
 * PRD 30.1: 返回缺字段清单
 */
export const finishMeeting = async (meetingId: string): Promise<FinishMeetingResponse> => {
  const response = await apiClient.post<FinishMeetingResponse>(`/company-meetings/${meetingId}/finish`);
  return response.data;
};

// ================================
// 参与者管理
// ================================

/**
 * 添加参与者
 */
export const addParticipant = async (
  meetingId: string,
  input: AddParticipantInput
): Promise<ParticipantResponse> => {
  const response = await apiClient.post<ParticipantResponse>(
    `/company-meetings/${meetingId}/participants`,
    input
  );
  return response.data;
};

/**
 * 更新参与者状态
 */
export const updateParticipant = async (
  meetingId: string,
  userId: string,
  input: UpdateParticipantInput
): Promise<ParticipantResponse> => {
  const response = await apiClient.patch<ParticipantResponse>(
    `/company-meetings/${meetingId}/participants/${userId}`,
    input
  );
  return response.data;
};

/**
 * 移除参与者
 */
export const removeParticipant = async (meetingId: string, userId: string): Promise<void> => {
  await apiClient.delete(`/company-meetings/${meetingId}/participants/${userId}`);
};

// ================================
// 外部嘉宾管理
// ================================

/**
 * 添加外部嘉宾
 */
export const addGuest = async (
  meetingId: string,
  input: AddGuestInput
): Promise<GuestResponse> => {
  const response = await apiClient.post<GuestResponse>(
    `/company-meetings/${meetingId}/guests`,
    input
  );
  return response.data;
};

/**
 * 更新外部嘉宾
 */
export const updateGuest = async (
  guestId: string,
  input: UpdateGuestInput
): Promise<GuestResponse> => {
  const response = await apiClient.patch<GuestResponse>(
    `/company-meetings/guests/${guestId}`,
    input
  );
  return response.data;
};

/**
 * 删除外部嘉宾
 */
export const deleteGuest = async (guestId: string): Promise<void> => {
  await apiClient.delete(`/company-meetings/guests/${guestId}`);
};

// ================================
// 会议纪要
// ================================

/**
 * 获取会议纪要
 */
export const getMinutes = async (meetingId: string): Promise<MinutesResponse | null> => {
  const response = await apiClient.get<MinutesResponse | null>(
    `/company-meetings/${meetingId}/minutes`
  );
  return response.data;
};

/**
 * 更新会议纪要
 */
export const updateMinutes = async (
  meetingId: string,
  input: UpdateMinutesInput
): Promise<MinutesResponse> => {
  const response = await apiClient.put<MinutesResponse>(
    `/company-meetings/${meetingId}/minutes`,
    input
  );
  return response.data;
};

// ================================
// PRD 19.6.3: 嘉宾补录完成度统计
// ================================

export interface GuestCompletionStats {
  meetingId: string;
  meetingTopic: string;
  meetingStatus: string;
  totalParticipants: number;
  participantsWithGuests: number;
  participantsWithoutGuests: number;
  totalGuests: number;
  guestsWithFullInfo: number;
  completionRate: number;
}

/**
 * 获取单个会议的嘉宾补录完成度（仅管理员）
 */
export const getGuestCompletionStats = async (
  meetingId: string
): Promise<GuestCompletionStats> => {
  const response = await apiClient.get<GuestCompletionStats>(
    `/company-meetings/${meetingId}/guest-completion`
  );
  return response.data;
};

/**
 * 获取所有已结束会议的嘉宾补录统计（仅管理员）
 */
export const getAllGuestCompletionStats = async (): Promise<{ data: GuestCompletionStats[] }> => {
  const response = await apiClient.get<{ data: GuestCompletionStats[] }>(
    '/company-meetings/admin/guest-completion-stats'
  );
  return response.data;
};

// ================================
// 人脉资源关联
// ================================

/**
 * 关联人脉资源到会议
 */
export const linkNetworkResource = async (
  meetingId: string,
  networkResourceId: string
): Promise<{ success: boolean }> => {
  const response = await apiClient.post<{ success: boolean }>(
    `/company-meetings/${meetingId}/network-links`,
    { networkResourceId }
  );
  return response.data;
};

/**
 * 获取会议关联的人脉资源
 */
export const getMeetingNetworkLinks = async (
  meetingId: string
): Promise<{ data: Array<{ id: string; name: string | null; organization: string | null; resourceType: string }> }> => {
  const response = await apiClient.get<{ data: Array<{ id: string; name: string | null; organization: string | null; resourceType: string }> }>(
    `/company-meetings/${meetingId}/network-links`
  );
  return response.data;
};

/**
 * 移除人脉资源关联
 */
export const unlinkNetworkResource = async (
  meetingId: string,
  resourceId: string
): Promise<void> => {
  await apiClient.delete(`/company-meetings/${meetingId}/network-links/${resourceId}`);
};

// ================================
// 对象式 API（统一风格）
// ================================

export const meetingsApi = {
  listMeetings,
  getMeeting: getMeetingById,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  finishMeeting,
  addParticipant,
  updateParticipant,
  removeParticipant,
  addGuest,
  updateGuest,
  deleteGuest,
  getMinutes,
  updateMinutes,
  getGuestCompletionStats,
  getAllGuestCompletionStats,
  linkNetworkResource,
  getMeetingNetworkLinks,
  unlinkNetworkResource,
};

