/**
 * 管理员控制台 DTO - Node 9
 * PRD 22: 管理员控制台（v3 增量）
 */

import { z } from 'zod';

// ================================
// 仪表盘统计
// ================================

export interface DashboardStatsResponse {
  // 项目统计
  projects: {
    total: number;
    pending: number;      // 待审核
    active: number;       // 进行中
    completed: number;    // 已完成
  };
  // 需求统计
  demands: {
    total: number;
    open: number;         // 进行中
    responseCount: number; // 响应数
  };
  // Token 统计
  tokens: {
    totalCirculation: number;  // 总流通量
    pendingTransfers: number;  // 待审核转账
    pendingGrants: number;     // 待审核发放
  };
  // 场地统计
  venues: {
    total: number;
    active: number;
    todayBookings: number;
    weekBookings: number;
  };
  // 会议统计
  meetings: {
    total: number;
    upcoming: number;     // 即将进行
    todayCount: number;   // 今日会议
  };
  // 通知统计
  notifications: {
    pendingEmails: number;
    failedEmails: number;
    todaySent: number;
  };
  // 用户统计
  users: {
    total: number;
    activeThisWeek: number;
  };
}

// ================================
// 审计日志查询
// ================================

export const ListAuditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  objectType: z.string().optional(),
  objectId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

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

// ================================
// 场地占用率统计
// ================================

export const VenueOccupancyQuerySchema = z.object({
  venueId: z.string().optional(),
  period: z.enum(['week', 'month']).default('week'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type VenueOccupancyQuery = z.infer<typeof VenueOccupancyQuerySchema>;

export interface VenueOccupancyResponse {
  venueId: string;
  venueName: string;
  period: 'week' | 'month';
  totalSlots: number;       // 总可用时段
  bookedSlots: number;      // 已预约时段
  occupancyRate: number;    // 占用率 (0-100)
  bookingsByDay: Array<{
    date: string;
    count: number;
    hours: number;
  }>;
}

// ================================
// 预约管理筛选
// ================================

export const AdminBookingListQuerySchema = z.object({
  venueId: z.string().optional(),
  date: z.string().optional(),         // YYYY-MM-DD
  ownerId: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'FINISHED']).optional(),
  hasMeal: z.string().transform(v => v === 'true').optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminBookingListQuery = z.infer<typeof AdminBookingListQuerySchema>;

// ================================
// 项目审核
// ================================

export const ProjectReviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().max(500).optional(),
});

export type ProjectReviewInput = z.infer<typeof ProjectReviewSchema>;

// ================================
// 响应裁决
// ================================

export const ResponseArbitrationSchema = z.object({
  decision: z.enum(['APPROVE_MODIFY', 'REJECT_MODIFY', 'APPROVE_ABANDON', 'REJECT_ABANDON']),
  comment: z.string().max(500).optional(),
});

export type ResponseArbitrationInput = z.infer<typeof ResponseArbitrationSchema>;

// ================================
// 系统配置
// ================================

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

export const UpdateSystemConfigSchema = z.object({
  tokenInitialAmounts: z.object({
    PARTNER: z.number().int().min(0).optional(),
    RESOURCE_PARTNER: z.number().int().min(0).optional(),
    LIMITED_PARTNER: z.number().int().min(0).optional(),
  }).optional(),
  grantDefaults: z.object({
    GOVERNMENT: z.number().int().min(0).optional(),
    ENTERPRISE: z.number().int().min(0).optional(),
    INVESTMENT: z.number().int().min(0).optional(),
    OTHER: z.number().int().min(0).optional(),
  }).optional(),
  selfRegistrationInviteCode: z.string().min(4, '邀请码至少4位').max(50).optional(),
  allowSelfRegistration: z.boolean().optional(),
});

export type UpdateSystemConfigInput = z.infer<typeof UpdateSystemConfigSchema>;






