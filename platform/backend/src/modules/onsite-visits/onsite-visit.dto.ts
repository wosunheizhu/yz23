/**
 * 线下到访记录 DTO
 * 用户直接记录邀请到公司线下的人员，独立于座谈会
 * 可作为业绩申请Token奖励
 */

import { z } from 'zod';

// ================================
// 枚举
// ================================

export const GuestCategory = {
  PUBLIC_CO_DMHG: 'PUBLIC_CO_DMHG',           // 上市公司董监高
  FIN_EXEC: 'FIN_EXEC',                       // 金融从业高管
  PUBLIC_CHAIRMAN_CONTROLLER: 'PUBLIC_CHAIRMAN_CONTROLLER', // 上市公司董事长/实控人
  DEPT_LEADER: 'DEPT_LEADER',                 // 处级领导
  BUREAU_LEADER: 'BUREAU_LEADER',             // 厅级领导
  MINISTRY_LEADER: 'MINISTRY_LEADER',         // 部委部级领导
  OTHER: 'OTHER',                             // 其他
} as const;

export type GuestCategory = (typeof GuestCategory)[keyof typeof GuestCategory];

// 嘉宾分类对应的默认Token额度（供管理员审核时参考）
export const GUEST_CATEGORY_DEFAULT_AMOUNT: Record<GuestCategory, number> = {
  [GuestCategory.PUBLIC_CO_DMHG]: 500,
  [GuestCategory.FIN_EXEC]: 500,
  [GuestCategory.PUBLIC_CHAIRMAN_CONTROLLER]: 1000,
  [GuestCategory.DEPT_LEADER]: 500,           // 处级领导
  [GuestCategory.BUREAU_LEADER]: 1000,        // 厅级领导
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

// ================================
// 创建线下到访记录 Schema
// ================================

export const CreateOnsiteVisitSchema = z.object({
  // 访客信息
  name: z.string().min(1, '访客姓名不能为空').max(100),
  organization: z.string().min(1, '所属组织不能为空').max(200),
  title: z.string().min(1, '职位不能为空').max(100),
  contact: z.string().max(200).optional(),
  purpose: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
  
  // 到访时间
  visitDate: z.string().transform((v) => new Date(v)),
  
  // 嘉宾分类
  guestCategory: z.enum([
    'PUBLIC_CO_DMHG',
    'FIN_EXEC',
    'PUBLIC_CHAIRMAN_CONTROLLER',
    'DEPT_LEADER',
    'BUREAU_LEADER',
    'MINISTRY_LEADER',
    'OTHER',
  ]),
  
  // 关联场地（可选）
  venueId: z.string().optional(),
});

export type CreateOnsiteVisitInput = z.infer<typeof CreateOnsiteVisitSchema>;

// ================================
// 更新线下到访记录 Schema
// ================================

export const UpdateOnsiteVisitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organization: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(100).optional(),
  contact: z.string().max(200).optional().nullable(),
  purpose: z.string().max(2000).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  visitDate: z.string().transform((v) => new Date(v)).optional(),
  guestCategory: z.enum([
    'PUBLIC_CO_DMHG',
    'FIN_EXEC',
    'PUBLIC_CHAIRMAN_CONTROLLER',
    'DEPT_LEADER',
    'BUREAU_LEADER',
    'MINISTRY_LEADER',
    'OTHER',
  ]).optional(),
  venueId: z.string().optional().nullable(),
});

export type UpdateOnsiteVisitInput = z.infer<typeof UpdateOnsiteVisitSchema>;

// ================================
// 查询参数 Schema
// ================================

export const ListOnsiteVisitsQuerySchema = z.object({
  search: z.string().optional(),
  guestCategory: z.enum([
    'PUBLIC_CO_DMHG',
    'FIN_EXEC',
    'PUBLIC_CHAIRMAN_CONTROLLER',
    'DEPT_LEADER',
    'BUREAU_LEADER',
    'MINISTRY_LEADER',
    'OTHER',
  ]).optional(),
  inviterId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  hasGrantTask: z.enum(['true', 'false']).optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('20'),
});

export type ListOnsiteVisitsQuery = z.infer<typeof ListOnsiteVisitsQuerySchema>;

// ================================
// 响应类型
// ================================

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

