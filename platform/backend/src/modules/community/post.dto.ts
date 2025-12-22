/**
 * 社群动态 DTO - Node 10
 * PRD 17/6.9: 社群模块
 */

import { z } from 'zod';

// ================================
// 动态类型枚举
// ================================

export const PostTypeSchema = z.enum([
  'GENERAL',           // 普通动态
  'PROJECT',           // 项目动态
  'RESOURCE',          // 资源相关
  'VOTE',              // 投票相关
  'ANNOUNCEMENT_REF',  // 公告引用
]);

export type PostType = z.infer<typeof PostTypeSchema>;

// ================================
// 创建动态
// ================================

export const CreatePostSchema = z.object({
  content: z.string().min(1, '内容不能为空').max(5000),
  postType: PostTypeSchema.default('GENERAL'),
  relatedObjectType: z.string().optional(),
  relatedObjectId: z.string().optional(),
  // 图片（base64 或 URL）
  images: z.array(z.string()).max(9, '最多上传9张图片').optional(),
  // 可见性
  visibilityScopeType: z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']).default('ALL'),
  visibilityMinRoleLevel: z.number().int().min(0).max(3).optional(),
  visibilityUserIds: z.array(z.string().cuid()).optional(),
  // @ 提及的用户
  mentionedUserIds: z.array(z.string().cuid()).optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// ================================
// 更新动态
// ================================

export const UpdatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
});

export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

// ================================
// 查询动态列表
// ================================

export const ListPostsQuerySchema = z.object({
  postType: PostTypeSchema.optional(),
  authorId: z.string().optional(),
  relatedObjectType: z.string().optional(),
  relatedObjectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPostsQuery = z.infer<typeof ListPostsQuerySchema>;

// ================================
// 评论
// ================================

export const CreateCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(2000),
  parentId: z.string().cuid().optional(), // 回复某条评论
  mentionedUserIds: z.array(z.string().cuid()).optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

// ================================
// 响应类型
// ================================

export interface PostResponse {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRoleLevel: string; // PRD 6.9.1.3: 显示作者角色
  content: string;
  images: string[];
  postType: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  visibilityScopeType: string;
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostListResponse {
  data: PostResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CommentResponse {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRoleLevel: string; // PRD 6.9.1.3: 显示作者角色
  content: string;
  parentId: string | null;
  createdAt: string;
}

export interface CommentListResponse {
  data: CommentResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PostDetailResponse extends PostResponse {
  comments: CommentResponse[];
}

