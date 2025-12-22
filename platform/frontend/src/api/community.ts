/**
 * 社群 API - Node 10
 * PRD 17/6.9: 社群模块（动态、评论、点赞）
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type PostType = 'GENERAL' | 'PROJECT' | 'RESOURCE' | 'VOTE' | 'ANNOUNCEMENT_REF';

export interface PostResponse {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRoleLevel: string; // PRD 6.9.1.3: 显示作者角色
  content: string;
  images: string[];
  postType: PostType;
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

export interface CreatePostInput {
  content: string;
  images?: string[];
  postType?: PostType;
  relatedObjectType?: string;
  relatedObjectId?: string;
  visibilityScopeType?: 'ALL' | 'ROLE_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
  mentionedUserIds?: string[];
}

export interface UpdatePostInput {
  content?: string;
}

export interface ListPostsQuery {
  postType?: PostType;
  authorId?: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  page?: number;
  pageSize?: number;
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

export interface CreateCommentInput {
  content: string;
  parentId?: string;
  mentionedUserIds?: string[];
}

export interface PostDetailResponse extends PostResponse {
  comments: CommentResponse[];
}

// ================================
// API 方法
// ================================

export const communityApi = {
  // ================================
  // 动态相关
  // ================================

  // 获取动态列表
  listPosts: (query?: ListPostsQuery) =>
    apiClient.get<PostListResponse>('/posts', { params: query }),

  // 获取动态详情
  getPost: (id: string) =>
    apiClient.get<PostDetailResponse>(`/posts/${id}`),

  // 发布动态
  createPost: (data: CreatePostInput) =>
    apiClient.post<PostResponse>('/posts', data),

  // 更新动态
  updatePost: (id: string, data: UpdatePostInput) =>
    apiClient.patch<PostResponse>(`/posts/${id}`, data),

  // 删除动态
  deletePost: (id: string) =>
    apiClient.delete<void>(`/posts/${id}`),

  // ================================
  // 点赞
  // ================================

  // 点赞动态
  likePost: (postId: string) =>
    apiClient.post<{ success: boolean }>(`/posts/${postId}/like`),

  // 取消点赞
  unlikePost: (postId: string) =>
    apiClient.delete<void>(`/posts/${postId}/like`),

  // ================================
  // 评论
  // ================================

  // 获取评论列表
  listComments: (postId: string, page?: number, pageSize?: number) =>
    apiClient.get<CommentListResponse>(`/posts/${postId}/comments`, {
      params: { page, pageSize },
    }),

  // 发表评论
  createComment: (postId: string, data: CreateCommentInput) =>
    apiClient.post<CommentResponse>(`/posts/${postId}/comments`, data),

  // 删除评论
  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete<void>(`/posts/${postId}/comments/${commentId}`),

  // ================================
  // 管理员功能
  // ================================

  // 管理员删除动态
  adminDeletePost: (id: string) =>
    apiClient.delete<void>(`/posts/admin/${id}`),
};

