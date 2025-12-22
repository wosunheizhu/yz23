/**
 * 公告管理 DTO - Node 9
 * PRD 6.12: 公告管理模块（管理员）
 */

import { z } from 'zod';

// ================================
// 创建公告
// ================================

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, '公告名称不能为空').max(200),
  summary: z.string().max(500).optional(),
  content: z.string().min(1, '公告内容不能为空').max(10000),
  attachments: z.array(z.string().url()).optional(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  isPinned: z.boolean().default(false),
  // 可见范围
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).default('ALL'),
  visibilityMinRoleLevel: z.number().int().min(0).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;

// ================================
// 更新公告
// ================================

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(1).max(10000).optional(),
  attachments: z.array(z.string().url()).optional(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional(),
  isPinned: z.boolean().optional(),
});

export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;

// ================================
// 查询公告列表
// ================================

export const ListAnnouncementsQuerySchema = z.object({
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAnnouncementsQuery = z.infer<typeof ListAnnouncementsQuerySchema>;

// ================================
// 响应类型
// ================================

export interface AnnouncementResponse {
  id: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  summary?: string | null;
  content: string;
  attachments: string[];
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  isPinned: boolean;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListResponse {
  data: AnnouncementResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

