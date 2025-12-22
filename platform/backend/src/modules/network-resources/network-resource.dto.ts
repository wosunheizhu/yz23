/**
 * 人脉资源模块 DTO
 * Node 4: 人脉资源体系
 * 
 * PRD 验收标准:
 * - 统一人脉资源表单组件后端能力（新建+选择+去重提示）
 * - 项目/需求/响应可关联人脉资源
 * - 去重提示测试（模糊：姓名+组织+职位）
 * - 可见性测试（敏感联系方式字段）
 */
import { z } from 'zod';

// ================================
// 枚举定义
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

// 联系进展状态 (PRD 10.3)
export const ContactStatus = {
  PENDING: 'PENDING',     // 待联系
  CONTACTED: 'CONTACTED', // 已联系
  SUCCEEDED: 'SUCCEEDED', // 已引荐成功
  FAILED: 'FAILED',       // 未成功
} as const;
export type ContactStatus = typeof ContactStatus[keyof typeof ContactStatus];

// ================================
// 创建人脉资源 (PRD 10.2)
// ================================
export const createNetworkResourceSchema = z.object({
  resourceType: z.enum(['PERSON', 'ORG']),
  name: z.string().min(1, { message: '姓名不能为空' }).max(100).optional(),
  organization: z.string().max(200).optional(),
  title: z.string().max(100).optional(), // 职位
  industryTags: z.array(z.string()).default([]),
  region: z.string().max(100).optional(),
  relationshipStrength: z.number().int().min(1).max(5).default(3),
  relationshipDesc: z.string().max(500).optional(),
  contact: z.string().max(200).optional(), // 敏感字段
  note: z.string().max(1000).optional(),
  // 联系进展状态 (PRD 10.3)
  contactStatus: z.enum(['PENDING', 'CONTACTED', 'SUCCEEDED', 'FAILED']).default('PENDING'),
  contactStatusNote: z.string().max(500).optional(),
  // 可见性
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']),
  visibilityMinRoleLevel: z.number().int().min(1).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
}).refine(
  (data) => {
    // PERSON 类型必须有姓名
    if (data.resourceType === 'PERSON' && !data.name) {
      return false;
    }
    // ORG 类型必须有组织名
    if (data.resourceType === 'ORG' && !data.organization) {
      return false;
    }
    return true;
  },
  { message: '个人资源必须填写姓名，机构资源必须填写组织名称' }
);
export type CreateNetworkResourceDto = z.infer<typeof createNetworkResourceSchema>;

// ================================
// 更新人脉资源
// ================================
export const updateNetworkResourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organization: z.string().max(200).optional(),
  title: z.string().max(100).optional(),
  industryTags: z.array(z.string()).optional(),
  region: z.string().max(100).optional(),
  relationshipStrength: z.number().int().min(1).max(5).optional(),
  relationshipDesc: z.string().max(500).optional(),
  contact: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  // 联系进展状态 (PRD 10.3)
  contactStatus: z.enum(['PENDING', 'CONTACTED', 'SUCCEEDED', 'FAILED']).optional(),
  contactStatusNote: z.string().max(500).optional(),
  // 可见性
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).optional(),
  visibilityMinRoleLevel: z.number().int().min(1).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
});
export type UpdateNetworkResourceDto = z.infer<typeof updateNetworkResourceSchema>;

// ================================
// 查询人脉资源列表 (PRD 10.3)
// ================================
export const listNetworkResourcesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(), // 搜索：姓名/机构/职位/行业标签
  resourceType: z.enum(['PERSON', 'ORG']).optional(),
  industryTag: z.string().optional(),
  region: z.string().optional(),
  relationshipStrength: z.coerce.number().int().min(1).max(5).optional(), // 精确匹配
  relationshipStrengthMin: z.coerce.number().int().min(1).max(5).optional(), // 最小值筛选 (PRD: strength_min)
  contactStatus: z.enum(['PENDING', 'CONTACTED', 'SUCCEEDED', 'FAILED']).optional(), // 联系进展筛选
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).optional(), // 可见范围筛选
  createdByMe: z.coerce.boolean().optional(), // 我创建的
  sortBy: z.enum(['createdAt', 'name', 'organization', 'relationshipStrength', 'contactStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListNetworkResourcesQueryDto = z.infer<typeof listNetworkResourcesQuerySchema>;

// ================================
// 去重检查 (PRD 10.2: 按姓名+组织+职位模糊提示)
// ================================
export const checkDuplicateSchema = z.object({
  name: z.string().optional(),
  organization: z.string().optional(),
  title: z.string().optional(),
});
export type CheckDuplicateDto = z.infer<typeof checkDuplicateSchema>;

// ================================
// 更新联系进展状态 (PRD 10.3)
// ================================
export const updateContactStatusSchema = z.object({
  contactStatus: z.enum(['PENDING', 'CONTACTED', 'SUCCEEDED', 'FAILED']),
  contactStatusNote: z.string().max(500).optional(),
});
export type UpdateContactStatusDto = z.infer<typeof updateContactStatusSchema>;

// ================================
// 关联人脉资源到业务对象
// ================================
export const linkToObjectSchema = z.object({
  networkResourceId: z.string().cuid(),
  objectType: z.enum(['PROJECT', 'DEMAND', 'RESPONSE', 'MEETING']),
  objectId: z.string().cuid(),
});
export type LinkToObjectDto = z.infer<typeof linkToObjectSchema>;

// ================================
// 创建引荐记录 (PRD 10.4)
// 点对点引荐：引荐给特定合伙人，仅对方可见
// ================================
export const createReferralSchema = z.object({
  networkResourceId: z.string().cuid().optional(), // 选择已有资源
  // 或者新建资源（内嵌表单）
  newResource: createNetworkResourceSchema.optional(),
  // 点对点引荐：必须指定目标用户
  targetUserId: z.string().cuid({ message: '必须选择引荐给哪位合伙人' }),
  // 引荐信息
  referralType: z.enum(['MEETING', 'PROJECT', 'DEMAND', 'OTHER']),
  relatedObjectType: z.enum(['MEETING', 'PROJECT', 'DEMAND']).optional(),
  relatedObjectId: z.string().cuid().optional(),
  description: z.string().min(1, { message: '引荐说明不能为空' }).max(1000),
  // 可见性字段已弃用，默认为CUSTOM仅目标用户可见
  // 保留字段以兼容旧API，但会被忽略
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).optional(),
  visibilityMinRoleLevel: z.number().int().min(1).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
}).refine(
  (data) => data.networkResourceId || data.newResource,
  { message: '必须选择已有人脉资源或新建人脉资源' }
);
export type CreateReferralDto = z.infer<typeof createReferralSchema>;

// ================================
// 查询引荐记录列表
// ================================
export const listReferralsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  referralType: z.enum(['MEETING', 'PROJECT', 'DEMAND', 'OTHER']).optional(),
  referrerUserId: z.string().cuid().optional(), // 按引荐人筛选
  networkResourceId: z.string().cuid().optional(), // 按资源筛选
  relatedObjectType: z.enum(['MEETING', 'PROJECT', 'DEMAND']).optional(), // 按关联对象类型筛选
  relatedObjectId: z.string().cuid().optional(), // 按关联对象ID筛选
  myReferrals: z.coerce.boolean().optional(), // 我的引荐
  sortBy: z.enum(['createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListReferralsQueryDto = z.infer<typeof listReferralsQuerySchema>;

// ================================
// 响应类型
// ================================

export interface NetworkResourceResponse {
  id: string;
  resourceType: NetworkResourceType;
  name: string | null;
  organization: string | null;
  title: string | null;
  industryTags: string[];
  region: string | null;
  relationshipStrength: number;
  relationshipDesc: string | null;
  contact: string | null; // 敏感字段，需根据权限过滤
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
  // 统计
  referralCount?: number;
  projectLinkCount?: number;
  demandLinkCount?: number;
}

export interface NetworkResourceListResponse {
  items: NetworkResourceResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReferralResponse {
  id: string;
  networkResourceId: string;
  networkResource?: NetworkResourceResponse;
  referrerUserId: string;
  referrerUserName?: string;
  // 点对点引荐：目标用户
  targetUserId: string;
  targetUserName?: string;
  referralType: ReferralType;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  relatedObjectName?: string; // 关联对象名称
  description: string;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferralListResponse {
  items: ReferralResponse[];
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
    similarity: number; // 相似度 0-1
  }[];
}

// 我的贡献统计 (PRD 9.1)
export interface MyContributionStats {
  networkResourcesCreated: number;  // 我新增的人脉资源数
  referralsCreated: number;         // 我发起的人脉引荐数
  projectLinksCount: number;        // 我的资源被项目关联次数
  demandLinksCount: number;         // 我的资源被需求关联次数
}

// 平台全局统计 (管理员专用)
export interface PlatformNetworkStats {
  totalResources: number;           // 人脉资源总数
  totalReferrals: number;           // 引荐记录总数
  totalProjectLinks: number;        // 项目关联总数
  totalDemandLinks: number;         // 需求关联总数
  totalMeetingLinks: number;        // 会议关联总数
  // 按状态统计
  resourcesByStatus: {
    PENDING: number;
    CONTACTED: number;
    SUCCEEDED: number;
    FAILED: number;
  };
  // 按资源类型统计
  resourcesByType: {
    PERSON: number;
    ORG: number;
  };
  // 顶级贡献者
  topContributors: {
    userId: string;
    userName: string;
    resourcesCreated: number;
    referralsCreated: number;
  }[];
}

