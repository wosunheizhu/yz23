/**
 * AI 服务 API - Node 10
 * PRD 6.6.3: 新闻数字人对话
 * PRD 6.5.5: 资源探索 AI
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface AIChatResponse {
  message: string;
  relatedNewsUrls?: string[];
  recommendedResourceIds?: string[];
}

export interface NewsSummaryResponse {
  summary: string;
}

export interface NewsKeywordsResponse {
  keywords: string[];
}

export interface AINewsSearchResponse {
  keywords: string[];
  data: Array<{
    id: string;
    title: string;
    url: string;
    summary: string | null;
    source: string | null;
    publishedAt: string | null;
    tags: string[];
    createdByName?: string;
  }>;
  hasMore: boolean; // 是否有更多推荐
  total: number;    // 匹配总数
}

export interface AIResourceRecommendResponse {
  searchTags: string[];
  data: Array<{
    id: string;
    name: string;
    category: string;
    description: string | null;
    keywords: string[];
    owner: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }>;
}

// ================================
// 新闻 AI API
// ================================

export const newsAIApi = {
  /**
   * 与新闻数字人对话
   * PRD 6.6.3: 与数字人对话，了解新闻
   */
  chat: (message: string, projectId?: string) =>
    apiClient.post<AIChatResponse>('/news/ai/chat', { message, projectId }),

  /**
   * 生成新闻摘要
   * PRD 6.6.4: AI 可根据网址总结内容和简介
   */
  generateSummary: (url: string, title?: string, content?: string) =>
    apiClient.post<NewsSummaryResponse>('/news/ai/summary', { url, title, content }),

  /**
   * 生成项目相关的新闻检索关键词
   * PRD 6.6.2.2: AI 生成检索关键词
   */
  generateKeywords: (projectId: string) =>
    apiClient.post<NewsKeywordsResponse>('/news/ai/keywords', { projectId }),

  /**
   * 根据项目 AI 推荐新闻
   * PRD 6.6.2.2: 项目驱动的新闻检索
   * @param onlyStronglyRelated 是否只看强相关
   */
  searchByProject: (projectId: string, options?: {
    limit?: number;
    onlyStronglyRelated?: boolean;
  }) =>
    apiClient.post<AINewsSearchResponse>('/news/ai/search', {
      projectId,
      limit: options?.limit,
      onlyStronglyRelated: options?.onlyStronglyRelated,
    }),

  /**
   * 换一批推荐
   * PRD 6.6.2.2: "换一批推荐"按钮
   * @param onlyStronglyRelated 是否只看强相关
   */
  refreshRecommendations: (projectId: string, skip: number, options?: {
    limit?: number;
    onlyStronglyRelated?: boolean;
  }) =>
    apiClient.post<AINewsSearchResponse>('/news/ai/search', {
      projectId,
      limit: options?.limit,
      refresh: true,
      skip,
      onlyStronglyRelated: options?.onlyStronglyRelated,
    }),
};

// ================================
// 资源 AI API
// ================================

export const resourceAIApi = {
  /**
   * 与资源探索 AI 对话
   * PRD 6.5.5: 资源探索 – 与 AI 数字人对话
   */
  chat: (message: string) =>
    apiClient.post<AIChatResponse>('/network-resources/ai/chat', { message }),

  /**
   * 根据需求 AI 推荐资源
   */
  recommend: (query: string, limit?: number) =>
    apiClient.post<AIResourceRecommendResponse>('/network-resources/ai/recommend', {
      query,
      limit,
    }),
};

