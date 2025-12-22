/**
 * 用户 API
 * 元征 · 合伙人赋能平台
 */

import { get, getPaginated, post, put, patch, del } from './client';

// 用户列表项
export interface UserListItem {
  id: string;
  name: string;
  roleLevel: string;
  isAdmin: boolean;
  avatarUrl: string | null;
  avatar?: string | null;
  selfDescription: string | null;
  expertiseAreas: string[];
  organization: string | null;
  email?: string | null;
  phone?: string | null;
  tags: string[];
  joinedAt: string;
  tokenBalance?: number;
}

// 用户贡献统计 (PRD 6.1.4 C2)
export interface UserContributionStats {
  projectCount: number;        // 参与项目数
  resourceCount: number;       // 提供资源次数
  guestInviteCount: number;    // 邀请会议嘉宾次数
  networkResourceCount: number; // 人脉资源数
}

// 用户详情
export interface UserDetail extends UserListItem {
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  contactInfo: string | null;
  address: string | null;
  education: Array<{
    school: string;
    degree?: string;
    major?: string;
    year?: number;
  }>;
  hobbies: string[];
  signature: string | null;
  organizationPublic: boolean;
  contactInfoPublic: boolean;
  addressPublic: boolean;
  tokenBalance?: number;
  // 贡献统计 (PRD 6.1.4 C2)
  stats?: UserContributionStats;
}

// 用户列表查询参数
export interface ListUsersParams {
  search?: string;
  roleLevel?: string;
  expertiseArea?: string;
  tag?: string;
  isAdmin?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}

// 获取用户列表
export const listUsers = (params?: ListUsersParams) =>
  getPaginated<UserListItem>('/users', params as Record<string, unknown>);

// 获取用户详情
export const getUserById = (id: string) =>
  get<UserDetail>(`/users/${id}`);

// 更新用户资料
export interface UpdateProfileParams {
  name?: string;
  gender?: string;
  birthDate?: string;
  selfDescription?: string;
  expertiseAreas?: string[];
  organization?: string;
  organizationPublic?: boolean;
  contactInfo?: string;
  contactInfoPublic?: boolean;
  address?: string;
  addressPublic?: boolean;
  education?: Array<{
    school: string;
    degree?: string;
    major?: string;
    year?: number;
  }>;
  tags?: string[];
  hobbies?: string[];
  signature?: string;
  avatarUrl?: string | null;
}

export const updateProfile = (id: string, params: UpdateProfileParams) =>
  patch<UserDetail>(`/users/${id}`, params);

// 创建用户（管理员）
export interface CreateUserParams {
  name: string;
  roleLevel: 'PARTNER' | 'CORE_PARTNER' | 'FOUNDER';
  email?: string;
  phone?: string;
  joinedAt: string;
  gender?: string;
  isAdmin?: boolean;
}

export const createUser = (params: CreateUserParams) =>
  post<UserDetail>('/users', params);

// 管理员更新用户
export interface AdminUpdateUserParams {
  roleLevel?: 'PARTNER' | 'CORE_PARTNER' | 'FOUNDER';
  isAdmin?: boolean;
  isDeleted?: boolean;
}

export const adminUpdateUser = (id: string, params: AdminUpdateUserParams) =>
  patch<UserDetail>(`/users/${id}`, params);

// 删除用户（管理员）
export const deleteUser = (id: string) =>
  del<{ message: string }>(`/users/${id}`);

// 获取用户统计
export interface UserStats {
  totalUsers: number;
  byRoleLevel: {
    FOUNDER: number;
    CORE_PARTNER: number;
    PARTNER: number;
  };
  adminCount: number;
}

export const getUserStats = () =>
  get<UserStats>('/users/stats');

// 获取所有擅长领域
export const getExpertiseAreas = () =>
  get<string[]>('/users/expertise-areas');

// 获取所有标签
export const getTags = () =>
  get<string[]>('/users/tags');

// ================================
// 本地标签/备注 (PRD 8.5 / 6.1.5)
// ================================

export interface LocalNote {
  id: string;
  targetUserId: string;
  targetUserName: string;
  tags: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// 获取我的所有本地标签/备注
export const listMyNotes = () =>
  get<LocalNote[]>('/users/notes');

// 获取我的所有本地标签
export const getMyNoteTags = () =>
  get<string[]>('/users/notes/tags');

// 获取我对某人的本地标签/备注
export const getLocalNote = (userId: string) =>
  get<LocalNote | null>(`/users/${userId}/note`);

// 创建或更新本地标签/备注
export interface UpsertNoteParams {
  note?: string;
  tags?: string[];
}

export const upsertLocalNote = (userId: string, params: UpsertNoteParams) =>
  put<LocalNote>(`/users/${userId}/note`, params);

// 删除本地标签/备注
export const deleteLocalNote = (userId: string) =>
  del<{ message: string }>(`/users/${userId}/note`);

// ================================
// 对象式 API（统一风格）
// ================================

export const usersApi = {
  listUsers,
  getUserById,
  updateProfile,
  createUser,
  adminUpdateUser,
  deleteUser,
  getUserStats,
  getExpertiseAreas,
  getTags,
  listMyNotes,
  getMyNoteTags,
  getLocalNote,
  upsertLocalNote,
  deleteLocalNote,
};

