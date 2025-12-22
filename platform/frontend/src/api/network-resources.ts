/**
 * 人脉资源模块 API 客户端
 * Node 4: 人脉资源体系
 */
import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export const NetworkResourceType = {
  PERSON: 'PERSON',
  ORG: 'ORG',
} as const;
export type NetworkResourceType = typeof NetworkResourceType[keyof typeof NetworkResourceType];

export const ReferralType = {
  MEETING: 'MEETING',
  PROJECT: 'PROJECT',
  DEMAND: 'DEMAND',
  OTHER: 'OTHER',
} as const;
export type ReferralType = typeof ReferralType[keyof typeof ReferralType];

// 状态中文标签
export const RESOURCE_TYPE_LABELS: Record<NetworkResourceType, string> = {
  PERSON: '个人',
  ORG: '机构',
};

export const REFERRAL_TYPE_LABELS: Record<ReferralType, string> = {
  MEETING: '座谈会相关',
  PROJECT: '项目相关',
  DEMAND: '需求相关',
  OTHER: '其他',
};

// 联系进展状态 (PRD 10.3)
export const ContactStatus = {
  PENDING: 'PENDING',
  CONTACTED: 'CONTACTED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;
export type ContactStatus = typeof ContactStatus[keyof typeof ContactStatus];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  PENDING: '待联系',
  CONTACTED: '已联系',
  SUCCEEDED: '已引荐成功',
  FAILED: '未成功',
};

// 关系强度标签
export const RELATIONSHIP_STRENGTH_LABELS: Record<number, string> = {
  1: '很弱',
  2: '较弱',
  3: '一般',
  4: '较强',
  5: '很强',
};

// 人脉资源
export interface NetworkResource {
  id: string;
  resourceType: NetworkResourceType;
  name: string | null;
  organization: string | null;
  title: string | null;
  industryTags: string[];
  region: string | null;
  relationshipStrength: number;
  relationshipDesc: string | null;
  contact: string | null;
  note: string | null;
  // 联系进展状态 (PRD 10.3)
  contactStatus: ContactStatus;
  contactStatusNote: string | null;
  createdByUserId: string;
  createdByUserName?: string;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
  referralCount?: number;
  projectLinkCount?: number;
  demandLinkCount?: number;
}

// 人脉资源列表响应
export interface NetworkResourceListResponse {
  items: NetworkResource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 引荐记录
export interface Referral {
  id: string;
  networkResourceId: string;
  networkResource?: NetworkResource;
  referrerUserId: string;
  referrerUserName?: string;
  // 点对点引荐：目标用户
  targetUserId: string;
  targetUserName?: string;
  referralType: ReferralType;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  relatedObjectName?: string;
  description: string;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

// 引荐记录列表响应
export interface ReferralListResponse {
  items: Referral[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 去重检查结果
export interface DuplicateCheckResult {
  hasPotentialDuplicates: boolean;
  duplicates: {
    id: string;
    name: string | null;
    organization: string | null;
    title: string | null;
    similarity: number;
  }[];
}

// 我的贡献统计
export interface MyContributionStats {
  networkResourcesCreated: number;
  referralsCreated: number;
  projectLinksCount: number;
  demandLinksCount: number;
}

// 平台全局统计 (管理员专用)
export interface PlatformNetworkStats {
  totalResources: number;
  totalReferrals: number;
  totalProjectLinks: number;
  totalDemandLinks: number;
  totalMeetingLinks: number;
  resourcesByStatus: {
    PENDING: number;
    CONTACTED: number;
    SUCCEEDED: number;
    FAILED: number;
  };
  resourcesByType: {
    PERSON: number;
    ORG: number;
  };
  topContributors: {
    userId: string;
    userName: string;
    resourcesCreated: number;
    referralsCreated: number;
  }[];
}

// 资源关联对象
export interface ResourceLinks {
  projects: { id: string; name: string }[];
  demands: { id: string; name: string }[];
  responses: { id: string; demandName: string }[];
  meetings: { id: string; topic: string }[];
}

// ================================
// 请求参数类型
// ================================

export interface CreateNetworkResourceParams {
  resourceType: NetworkResourceType;
  name?: string;
  organization?: string;
  title?: string;
  industryTags?: string[];
  region?: string;
  relationshipStrength?: number;
  relationshipDesc?: string;
  contact?: string;
  note?: string;
  // 联系进展状态 (PRD 10.3)
  contactStatus?: ContactStatus;
  contactStatusNote?: string;
  visibilityScopeType: 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
}

export interface UpdateNetworkResourceParams {
  name?: string;
  organization?: string;
  title?: string;
  industryTags?: string[];
  region?: string;
  relationshipStrength?: number;
  relationshipDesc?: string;
  contact?: string;
  note?: string;
  // 联系进展状态 (PRD 10.3)
  contactStatus?: ContactStatus;
  contactStatusNote?: string;
  visibilityScopeType?: 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
}

// 更新联系进展状态
export interface UpdateContactStatusParams {
  contactStatus: ContactStatus;
  contactStatusNote?: string;
}

export interface ListNetworkResourcesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  resourceType?: NetworkResourceType;
  industryTag?: string;
  region?: string;
  relationshipStrength?: number; // 精确匹配
  relationshipStrengthMin?: number; // 最小值筛选 (PRD: strength_min)
  contactStatus?: ContactStatus; // 联系进展筛选
  visibilityScopeType?: 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM'; // 可见范围筛选
  createdByMe?: boolean;
  sortBy?: 'createdAt' | 'name' | 'organization' | 'relationshipStrength' | 'contactStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface CheckDuplicateParams {
  name?: string;
  organization?: string;
  title?: string;
}

export interface LinkToObjectParams {
  networkResourceId: string;
  objectType: 'PROJECT' | 'DEMAND' | 'RESPONSE' | 'MEETING';
  objectId: string;
}

export interface CreateReferralParams {
  networkResourceId?: string;
  newResource?: CreateNetworkResourceParams;
  // 点对点引荐：必须指定目标合伙人
  targetUserId: string;
  referralType: ReferralType;
  relatedObjectType?: 'MEETING' | 'PROJECT' | 'DEMAND';
  relatedObjectId?: string;
  description: string;
  // 可见性字段已弃用（默认为CUSTOM仅目标用户可见），保留以兼容
  visibilityScopeType?: 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
}

export interface ListReferralsParams {
  page?: number;
  pageSize?: number;
  referralType?: ReferralType;
  referrerUserId?: string;
  networkResourceId?: string;
  relatedObjectType?: 'MEETING' | 'PROJECT' | 'DEMAND'; // 按关联对象类型筛选
  relatedObjectId?: string; // 按关联对象ID筛选
  myReferrals?: boolean;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ================================
// 人脉资源 API
// ================================

/**
 * 创建人脉资源
 */
export const createNetworkResource = async (
  data: CreateNetworkResourceParams
): Promise<NetworkResource> => {
  const response = await apiClient.post('/network-resources', data);
  return response.data.data;
};

/**
 * 获取人脉资源列表
 */
export const getNetworkResources = async (
  params?: ListNetworkResourcesParams
): Promise<NetworkResourceListResponse> => {
  const response = await apiClient.get('/network-resources', { params });
  return response.data.data;
};

/**
 * 获取人脉资源详情
 */
export const getNetworkResource = async (id: string): Promise<NetworkResource> => {
  const response = await apiClient.get(`/network-resources/${id}`);
  return response.data.data;
};

/**
 * 更新人脉资源
 */
export const updateNetworkResource = async (
  id: string,
  data: UpdateNetworkResourceParams
): Promise<NetworkResource> => {
  const response = await apiClient.put(`/network-resources/${id}`, data);
  return response.data.data;
};

/**
 * 删除人脉资源
 */
export const deleteNetworkResource = async (id: string): Promise<void> => {
  await apiClient.delete(`/network-resources/${id}`);
};

/**
 * 更新联系进展状态 (PRD 10.3)
 */
export const updateContactStatus = async (
  id: string,
  data: UpdateContactStatusParams
): Promise<NetworkResource> => {
  const response = await apiClient.patch(`/network-resources/${id}/contact-status`, data);
  return response.data.data;
};

/**
 * 检查重复
 */
export const checkDuplicate = async (
  data: CheckDuplicateParams
): Promise<DuplicateCheckResult> => {
  const response = await apiClient.post('/network-resources/check-duplicate', data);
  return response.data.data;
};

/**
 * 关联到业务对象
 */
export const linkToObject = async (data: LinkToObjectParams): Promise<void> => {
  await apiClient.post('/network-resources/link', data);
};

/**
 * 取消关联
 */
export const unlinkFromObject = async (data: LinkToObjectParams): Promise<void> => {
  await apiClient.post('/network-resources/unlink', data);
};

/**
 * 获取资源的关联对象
 */
export const getResourceLinks = async (id: string): Promise<ResourceLinks> => {
  const response = await apiClient.get(`/network-resources/${id}/links`);
  return response.data.data;
};

/**
 * 我的贡献统计
 */
export const getMyContributionStats = async (): Promise<MyContributionStats> => {
  const response = await apiClient.get('/network-resources/my-contribution');
  return response.data.data;
};

/**
 * 管理员平台统计
 */
export const getPlatformStats = async (): Promise<PlatformNetworkStats> => {
  const response = await apiClient.get('/network-resources/admin/stats');
  return response.data.data;
};

// ================================
// 引荐记录 API
// ================================

/**
 * 创建引荐记录
 */
export const createReferral = async (data: CreateReferralParams): Promise<Referral> => {
  const response = await apiClient.post('/network-resources/referrals', data);
  return response.data.data;
};

/**
 * 获取引荐记录列表
 */
export const getReferrals = async (
  params?: ListReferralsParams
): Promise<ReferralListResponse> => {
  const response = await apiClient.get('/network-resources/referrals', { params });
  return response.data.data;
};

/**
 * 获取引荐记录详情
 */
export const getReferral = async (id: string): Promise<Referral> => {
  const response = await apiClient.get(`/network-resources/referrals/${id}`);
  return response.data.data;
};

// ================================
// 辅助函数
// ================================

/**
 * 获取资源显示名称
 */
export const getResourceDisplayName = (resource: NetworkResource): string => {
  if (resource.resourceType === 'PERSON') {
    return resource.name || '未知姓名';
  }
  return resource.organization || '未知机构';
};

/**
 * 获取资源完整描述
 */
export const getResourceDescription = (resource: NetworkResource): string => {
  const parts = [];
  if (resource.name) parts.push(resource.name);
  if (resource.organization) parts.push(resource.organization);
  if (resource.title) parts.push(resource.title);
  return parts.join(' · ') || '未知资源';
};

