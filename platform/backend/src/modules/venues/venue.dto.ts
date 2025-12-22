/**
 * 场地管理 DTO - Node 5
 * PRD 19.4: 场地与会议室（Venue）基础能力
 */

import { z } from 'zod';

// ================================
// 枚举
// ================================

export const VenueStatus = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  DISABLED: 'DISABLED',
} as const;

export type VenueStatus = (typeof VenueStatus)[keyof typeof VenueStatus];

// ================================
// 创建场地 Schema
// ================================

export const CreateVenueSchema = z.object({
  name: z.string().min(1, '场地名称不能为空').max(100),
  address: z.string().max(200).optional(),
  capacity: z.number().int().positive().optional(),
  supportsMeal: z.boolean().default(true),
  note: z.string().max(1000).optional(),
});

export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;

// ================================
// 更新场地 Schema
// ================================

export const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  supportsMeal: z.boolean().optional(),
  note: z.string().max(1000).optional().nullable(),
});

export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;

// ================================
// 查询参数 Schema
// ================================

export const ListVenuesQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'DISABLED']).optional(),
  supportsMeal: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(), // 名称/地址模糊搜索
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('20'),
});

export type ListVenuesQuery = z.infer<typeof ListVenuesQuerySchema>;

// ================================
// 响应类型
// ================================

export interface VenueResponse {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  supportsMeal: boolean;
  note: string | null;
  status: VenueStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueListResponse {
  data: VenueResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface VenueStatsResponse {
  totalVenues: number;
  activeVenues: number;
  maintenanceVenues: number;
  disabledVenues: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
}






