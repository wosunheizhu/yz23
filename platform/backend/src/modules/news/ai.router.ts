/**
 * 新闻 AI 路由 - Node 10
 * PRD 6.6.3: 数字人对话
 * PRD 6.6.2.2: 项目驱动的关键词推荐
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';
import { prisma } from '../../utils/db.js';
import * as aiService from '../../services/ai.service.js';

const router: Router = Router();

// ================================
// 请求验证
// ================================

const ChatWithNewsSchema = z.object({
  message: z.string().min(1).max(2000),
  projectId: z.string().optional(),
});

const GenerateSummarySchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().optional(),
});

const GenerateKeywordsSchema = z.object({
  projectId: z.string().cuid(),
});

// ================================
// AI 路由
// ================================

/**
 * POST /news/ai/chat
 * 与新闻数字人对话
 * PRD 6.6.3: 与数字人对话，了解新闻
 */
router.post(
  '/ai/chat',
  authenticate,
  validateBody(ChatWithNewsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, projectId } = req.body;

      // 获取项目信息（如果有）
      let projectName: string | undefined;
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { name: true },
        });
        projectName = project?.name;
      }

      // 获取最近的新闻作为上下文
      const recentNews = await prisma.news.findMany({
        where: { isDeleted: false },
        select: { title: true, summary: true, url: true },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });

      const result = await aiService.chatWithNewsAssistant(message, {
        projectId,
        projectName,
        recentNews: recentNews.map((n) => ({
          title: n.title,
          summary: n.summary || undefined,
          url: n.url,
        })),
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /news/ai/summary
 * 生成新闻摘要
 * PRD 6.6.4: AI 可根据网址总结内容和简介
 */
router.post(
  '/ai/summary',
  authenticate,
  validateBody(GenerateSummarySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, content } = req.body;

      const summary = await aiService.generateNewsSummary(
        title || '未知标题',
        content
      );

      res.json({ summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /news/ai/keywords
 * 生成项目相关的新闻检索关键词
 * PRD 6.6.2.2: AI 生成检索关键词
 */
router.post(
  '/ai/keywords',
  authenticate,
  validateBody(GenerateKeywordsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.body;

      // 获取项目信息
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          businessType: true,
          industry: true,
          region: true,
          description: true,
        },
      });

      if (!project) {
        res.status(404).json({ error: '项目不存在' });
        return;
      }

      const keywords = await aiService.generateNewsKeywords({
        name: project.name,
        businessType: project.businessType,
        industry: project.industry || undefined,
        region: project.region || undefined,
        description: project.description || undefined,
      });

      res.json({ keywords });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /news/ai/search
 * 根据项目 AI 推荐新闻
 * PRD 6.6.2.2: 项目驱动的新闻检索
 * 支持 refresh 参数实现"换一批推荐"功能
 * 支持 onlyStronglyRelated 参数实现"只看强相关"开关
 */
router.post(
  '/ai/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, limit = 10, refresh = false, skip = 0, onlyStronglyRelated = false } = req.body;

      // 获取项目信息
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          businessType: true,
          industry: true,
          region: true,
          description: true,
        },
      });

      if (!project) {
        res.status(404).json({ error: '项目不存在' });
        return;
      }

      // 生成关键词
      const keywords = await aiService.generateNewsKeywords({
        name: project.name,
        businessType: project.businessType,
        industry: project.industry || undefined,
        region: project.region || undefined,
        description: project.description || undefined,
      });

      // 构建搜索条件
      // onlyStronglyRelated=true 时要求匹配多个关键词（AND 逻辑）
      // onlyStronglyRelated=false 时只需匹配任一关键词（OR 逻辑）
      const keywordConditions = keywords.flatMap((keyword) => [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { summary: { contains: keyword, mode: 'insensitive' as const } },
        { tags: { has: keyword } },
      ]);

      // 强相关：使用 AND 逻辑，要求匹配至少两个不同关键词
      const whereCondition = onlyStronglyRelated && keywords.length >= 2
        ? {
            isDeleted: false,
            AND: [
              {
                OR: keywords.slice(0, Math.ceil(keywords.length / 2)).flatMap((keyword) => [
                  { title: { contains: keyword, mode: 'insensitive' as const } },
                  { summary: { contains: keyword, mode: 'insensitive' as const } },
                  { tags: { has: keyword } },
                ]),
              },
              {
                OR: keywords.slice(Math.ceil(keywords.length / 2)).flatMap((keyword) => [
                  { title: { contains: keyword, mode: 'insensitive' as const } },
                  { summary: { contains: keyword, mode: 'insensitive' as const } },
                  { tags: { has: keyword } },
                ]),
              },
            ],
          }
        : {
            isDeleted: false,
            OR: keywordConditions,
          };

      // 使用关键词搜索新闻
      // refresh=true 时跳过已展示的新闻，获取下一批
      const news = await prisma.news.findMany({
        where: whereCondition,
        orderBy: refresh
          ? [{ publishedAt: 'desc' }, { id: 'asc' }] // 固定排序以支持分页
          : { publishedAt: 'desc' },
        skip: refresh ? skip : 0,
        take: limit,
        include: {
          createdBy: { select: { name: true } },
        },
      });

      // 获取匹配总数（用于前端判断是否还有更多）
      const total = await prisma.news.count({
        where: whereCondition,
      });

      res.json({
        keywords,
        data: news.map((n) => ({
          id: n.id,
          title: n.title,
          url: n.url,
          summary: n.summary,
          source: n.source,
          publishedAt: n.publishedAt?.toISOString(),
          tags: n.tags,
          createdByName: n.createdBy?.name,
        })),
        hasMore: skip + news.length < total,
        total,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as newsAIRouter };

