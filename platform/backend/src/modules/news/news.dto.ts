/**
 * 新闻资讯 DTO - Node 10
 * PRD 16/6.6: 新闻资讯模块
 */

import { z } from 'zod';

// ================================
// 创建新闻
// ================================

export const CreateNewsSchema = z.object({
  url: z.string().url('请输入有效的网址'),
  title: z.string().max(500).optional(),
  summary: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  publishedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  industry: z.string().max(50).optional(),
  region: z.string().max(50).optional(),
  projectIds: z.array(z.string().cuid()).optional(), // 关联项目
  autoSummarize: z.boolean().default(false), // 是否自动 AI 摘要
});

export type CreateNewsInput = z.infer<typeof CreateNewsSchema>;

// ================================
// 更新新闻
// ================================

export const UpdateNewsSchema = z.object({
  title: z.string().max(500).optional(),
  summary: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  industry: z.string().max(50).optional(),
  region: z.string().max(50).optional(),
});

export type UpdateNewsInput = z.infer<typeof UpdateNewsSchema>;

// ================================
// 查询新闻列表
// ================================

export const ListNewsQuerySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  projectIds: z.string().optional(), // 逗号分隔的多个项目ID
  industry: z.string().optional(),
  region: z.string().optional(),
  tag: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListNewsQuery = z.infer<typeof ListNewsQuerySchema>;

// ================================
// 新闻源配置
// ================================

export const CreateNewsSourceSchema = z.object({
  name: z.string().min(1).max(100),
  sourceType: z.enum(['RSS', 'HTML', 'API']),
  baseUrl: z.string().url(),
  fetchInterval: z.number().int().min(1).max(1440), // 1分钟到24小时
  parseRules: z.record(z.unknown()).optional(),
  defaultTags: z.array(z.string()).optional(),
});

export type CreateNewsSourceInput = z.infer<typeof CreateNewsSourceSchema>;

export const UpdateNewsSourceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  fetchInterval: z.number().int().min(1).max(1440).optional(),
  parseRules: z.record(z.unknown()).optional(),
  defaultTags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateNewsSourceInput = z.infer<typeof UpdateNewsSourceSchema>;

// ================================
// 响应类型
// ================================

export interface NewsResponse {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  source: string | null;
  publishedAt: string | null;
  tags: string[];
  industry: string | null;
  region: string | null;
  createdById: string | null;
  createdByName?: string;
  createdAt: string;
  relatedProjects?: Array<{ id: string; name: string }>;
}

export interface NewsListResponse {
  data: NewsResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface NewsSourceResponse {
  id: string;
  name: string;
  sourceType: string;
  baseUrl: string;
  fetchInterval: number;
  parseRules: Record<string, unknown> | null;
  defaultTags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsStatsResponse {
  total: number;
  todayCount: number;
  weekCount: number;
  bySource: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}

