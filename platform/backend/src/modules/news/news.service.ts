/**
 * 新闻资讯服务 - Node 10
 * PRD 16/6.6: 新闻资讯模块
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../utils/audit.js';
import type {
  CreateNewsInput,
  UpdateNewsInput,
  ListNewsQuery,
  NewsResponse,
  NewsListResponse,
  CreateNewsSourceInput,
  UpdateNewsSourceInput,
  NewsSourceResponse,
  NewsStatsResponse,
} from './news.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 创建新闻
// ================================

/**
 * 添加新闻
 * PRD 6.6.4: 添加公开新闻资讯
 */
export const createNews = async (
  input: CreateNewsInput,
  userId: string
): Promise<NewsResponse> => {
  const { url, title, summary, source, publishedAt, tags, industry, region, projectIds } = input;

  // 检查 URL 是否已存在
  const existing = await prisma.news.findUnique({ where: { url } });
  if (existing) {
    if (existing.isDeleted) {
      // 恢复已删除的新闻
      const restored = await prisma.news.update({
        where: { id: existing.id },
        data: {
          isDeleted: false,
          title: title || existing.title,
          summary: summary || existing.summary,
          tags: tags || existing.tags,
        },
        include: {
          createdBy: { select: { name: true } },
          projects: { include: { project: { select: { id: true, name: true } } } },
        },
      });
      return formatNews(restored);
    }
    throw new Error('该新闻链接已存在');
  }

  const news = await prisma.news.create({
    data: {
      url,
      title: title || '待抓取标题',
      summary,
      source,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      tags: tags || [],
      industry,
      region,
      createdById: userId,
    },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  // 关联项目
  if (projectIds && projectIds.length > 0) {
    await prisma.projectNews.createMany({
      data: projectIds.map((projectId) => ({
        projectId,
        newsId: news.id,
      })),
      skipDuplicates: true,
    });
  }

  await createAuditLog({
    userId,
    action: 'CREATE',
    objectType: 'NEWS',
    objectId: news.id,
    summary: `添加新闻: ${news.title}`,
    metadata: { url },
  });

  logger.info({ newsId: news.id, userId }, '新闻已添加');

  return formatNews(news);
};

// ================================
// 获取新闻列表
// ================================

/**
 * 获取新闻列表
 * PRD 6.6.2: 查看公开新闻资讯
 */
export const listNews = async (query: ListNewsQuery): Promise<NewsListResponse> => {
  const { search, projectId, projectIds, industry, region, tag, from, to, page, pageSize } = query;

  const where: Record<string, unknown> = { ...notDeleted };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { summary: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  if (industry) where.industry = industry;
  if (region) where.region = region;
  if (tag) where.tags = { has: tag };

  if (from || to) {
    where.publishedAt = {};
    if (from) (where.publishedAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.publishedAt as Record<string, Date>).lte = new Date(to);
  }

  // 项目筛选 - 单个项目
  if (projectId) {
    where.projects = { some: { projectId } };
  }
  
  // 项目筛选 - 多个项目（逗号分隔）
  if (projectIds) {
    const ids = projectIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      where.projects = { some: { projectId: { in: ids } } };
    }
  }

  const [items, total] = await Promise.all([
    prisma.news.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        projects: { include: { project: { select: { id: true, name: true } } } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.news.count({ where }),
  ]);

  return {
    data: items.map(formatNews),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取项目相关新闻
 * PRD 6.6.2.2: 项目驱动的新闻检索
 */
export const getProjectRelatedNews = async (
  projectId: string,
  limit: number = 10
): Promise<NewsResponse[]> => {
  // 获取项目关联的新闻
  const projectNews = await prisma.projectNews.findMany({
    where: { projectId },
    include: {
      news: {
        include: {
          createdBy: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return projectNews
    .filter((pn) => !pn.news.isDeleted)
    .map((pn) => formatNews(pn.news));
};

// ================================
// 获取新闻详情
// ================================

export const getNewsById = async (id: string): Promise<NewsResponse | null> => {
  const news = await prisma.news.findFirst({
    where: { id, ...notDeleted },
    include: {
      createdBy: { select: { name: true } },
      projects: { include: { project: { select: { id: true, name: true } } } },
    },
  });

  return news ? formatNews(news) : null;
};

// ================================
// 更新新闻
// ================================

export const updateNews = async (
  id: string,
  input: UpdateNewsInput,
  adminId: string
): Promise<NewsResponse> => {
  const news = await prisma.news.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.summary && { summary: input.summary }),
      ...(input.tags && { tags: input.tags }),
      ...(input.industry !== undefined && { industry: input.industry }),
      ...(input.region !== undefined && { region: input.region }),
    },
    include: {
      createdBy: { select: { name: true } },
      projects: { include: { project: { select: { id: true, name: true } } } },
    },
  });

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE',
    objectType: 'NEWS',
    objectId: id,
    summary: `更新新闻: ${news.title}`,
    metadata: input,
  });

  return formatNews(news);
};

// ================================
// 删除新闻
// ================================

export const deleteNews = async (id: string, adminId: string): Promise<void> => {
  const news = await prisma.news.update({
    where: { id },
    data: { isDeleted: true },
  });

  await createAuditLog({
    userId: adminId,
    action: 'DELETE',
    objectType: 'NEWS',
    objectId: id,
    summary: `删除新闻: ${news.title}`,
  });

  logger.info({ newsId: id, adminId }, '新闻已删除');
};

// ================================
// 关联/取消关联项目
// ================================

export const linkNewsToProject = async (
  newsId: string,
  projectId: string,
  userId: string
): Promise<void> => {
  await prisma.projectNews.create({
    data: { newsId, projectId },
  });

  await createAuditLog({
    userId,
    action: 'LINK',
    objectType: 'PROJECT_NEWS',
    objectId: `${newsId}_${projectId}`,
    summary: '关联新闻到项目',
    metadata: { newsId, projectId },
  });
};

export const unlinkNewsFromProject = async (
  newsId: string,
  projectId: string,
  userId: string
): Promise<void> => {
  await prisma.projectNews.deleteMany({
    where: { newsId, projectId },
  });

  await createAuditLog({
    userId,
    action: 'UNLINK',
    objectType: 'PROJECT_NEWS',
    objectId: `${newsId}_${projectId}`,
    summary: '取消新闻与项目关联',
    metadata: { newsId, projectId },
  });
};

// ================================
// 新闻源管理（管理员）
// ================================

/**
 * 获取新闻源列表
 * PRD 6.6.5: 新闻源配置与自动爬取
 */
export const listNewsSources = async (): Promise<NewsSourceResponse[]> => {
  const sources = await prisma.newsSource.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return sources.map(formatNewsSource);
};

export const createNewsSource = async (
  input: CreateNewsSourceInput,
  adminId: string
): Promise<NewsSourceResponse> => {
  const source = await prisma.newsSource.create({
    data: {
      name: input.name,
      sourceType: input.sourceType,
      baseUrl: input.baseUrl,
      fetchInterval: input.fetchInterval,
      parseRules: (input.parseRules || null) as any,
      defaultTags: input.defaultTags || [],
    },
  });

  await createAuditLog({
    userId: adminId,
    action: 'CREATE',
    objectType: 'NEWS_SOURCE',
    objectId: source.id,
    summary: `创建新闻源: ${source.name}`,
    metadata: { sourceType: input.sourceType, baseUrl: input.baseUrl },
  });

  logger.info({ sourceId: source.id, adminId }, '新闻源已创建');

  return formatNewsSource(source);
};

export const updateNewsSource = async (
  id: string,
  input: UpdateNewsSourceInput,
  adminId: string
): Promise<NewsSourceResponse> => {
  const source = await prisma.newsSource.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.baseUrl && { baseUrl: input.baseUrl }),
      ...(input.fetchInterval && { fetchInterval: input.fetchInterval }),
      ...(input.parseRules !== undefined && { parseRules: input.parseRules as any }),
      ...(input.defaultTags !== undefined && { defaultTags: input.defaultTags }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE',
    objectType: 'NEWS_SOURCE',
    objectId: id,
    summary: `更新新闻源: ${source.name}`,
    metadata: input,
  });

  return formatNewsSource(source);
};

export const deleteNewsSource = async (id: string, adminId: string): Promise<void> => {
  const source = await prisma.newsSource.delete({ where: { id } });

  await createAuditLog({
    userId: adminId,
    action: 'DELETE',
    objectType: 'NEWS_SOURCE',
    objectId: id,
    summary: `删除新闻源: ${source.name}`,
  });

  logger.info({ sourceId: id, adminId }, '新闻源已删除');
};

// ================================
// 新闻统计
// ================================

export const getNewsStats = async (): Promise<NewsStatsResponse> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, todayCount, weekCount, allNews] = await Promise.all([
    prisma.news.count({ where: notDeleted }),
    prisma.news.count({
      where: { ...notDeleted, createdAt: { gte: todayStart } },
    }),
    prisma.news.count({
      where: { ...notDeleted, createdAt: { gte: weekStart } },
    }),
    prisma.news.findMany({
      where: notDeleted,
      select: { source: true, tags: true },
    }),
  ]);

  // 按来源统计
  const bySource: Record<string, number> = {};
  allNews.forEach((n) => {
    const src = n.source || '未知来源';
    bySource[src] = (bySource[src] || 0) + 1;
  });

  // 统计热门标签
  const tagCounts: Record<string, number> = {};
  allNews.forEach((n) => {
    n.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  return {
    total,
    todayCount,
    weekCount,
    bySource,
    topTags,
  };
};

// ================================
// 辅助函数
// ================================

const formatNews = (news: any): NewsResponse => ({
  id: news.id,
  title: news.title,
  url: news.url,
  summary: news.summary,
  source: news.source,
  publishedAt: news.publishedAt?.toISOString() || null,
  tags: news.tags || [],
  industry: news.industry,
  region: news.region,
  createdById: news.createdById,
  createdByName: news.createdBy?.name,
  createdAt: news.createdAt.toISOString(),
  relatedProjects: news.projects?.map((pn: any) => ({
    id: pn.project.id,
    name: pn.project.name,
  })),
});

const formatNewsSource = (source: any): NewsSourceResponse => ({
  id: source.id,
  name: source.name,
  sourceType: source.sourceType,
  baseUrl: source.baseUrl,
  fetchInterval: source.fetchInterval,
  parseRules: source.parseRules as Record<string, unknown> | null,
  defaultTags: source.defaultTags || [],
  isActive: source.isActive,
  createdAt: source.createdAt.toISOString(),
  updatedAt: source.updatedAt.toISOString(),
});

