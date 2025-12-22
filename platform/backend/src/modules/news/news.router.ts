/**
 * 新闻资讯路由 - Node 10
 * PRD 16/6.6: 新闻资讯模块
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  CreateNewsSchema,
  UpdateNewsSchema,
  ListNewsQuerySchema,
  CreateNewsSourceSchema,
  UpdateNewsSourceSchema,
} from './news.dto.js';
import * as newsService from './news.service.js';
import { triggerNewsFetch } from '../../jobs/news-processor.js';

const router: Router = Router();

// ================================
// 公开接口（已认证用户）
// ================================

/**
 * GET /news
 * 获取新闻列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListNewsQuerySchema),
  async (req: Request, res: Response) => {
    const result = await newsService.listNews(req.query as never);
    res.json(result);
  }
);

/**
 * GET /news/stats
 * 获取新闻统计（管理员）
 */
router.get(
  '/stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await newsService.getNewsStats();
    res.json(result);
  }
);

/**
 * GET /news/project/:projectId
 * 获取项目相关新闻
 */
router.get(
  '/project/:projectId',
  authenticate,
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await newsService.getProjectRelatedNews(req.params.projectId, limit);
    res.json({ data: result });
  }
);

/**
 * GET /news/:id
 * 获取新闻详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await newsService.getNewsById(req.params.id);
  if (!result) {
    res.status(404).json({ error: '新闻不存在' });
    return;
  }
  res.json(result);
});

/**
 * POST /news
 * 添加新闻
 */
router.post(
  '/',
  authenticate,
  validateBody(CreateNewsSchema),
  async (req: Request, res: Response) => {
    const result = await newsService.createNews(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * POST /news/:id/link-project
 * 关联新闻到项目
 */
router.post(
  '/:id/link-project',
  authenticate,
  async (req: Request, res: Response) => {
    const { projectId } = req.body;
    await newsService.linkNewsToProject(req.params.id, projectId, req.user!.userId);
    res.json({ success: true });
  }
);

/**
 * DELETE /news/:id/link-project/:projectId
 * 取消新闻与项目关联
 */
router.delete(
  '/:id/link-project/:projectId',
  authenticate,
  async (req: Request, res: Response) => {
    await newsService.unlinkNewsFromProject(
      req.params.id,
      req.params.projectId,
      req.user!.userId
    );
    res.status(204).send();
  }
);

// ================================
// 管理员接口
// ================================

/**
 * PATCH /news/:id
 * 更新新闻（管理员）
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  validateBody(UpdateNewsSchema),
  async (req: Request, res: Response) => {
    const result = await newsService.updateNews(req.params.id, req.body, req.user!.userId);
    res.json(result);
  }
);

/**
 * DELETE /news/:id
 * 删除新闻（管理员）
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    await newsService.deleteNews(req.params.id, req.user!.userId);
    res.status(204).send();
  }
);

// ================================
// 新闻源管理（管理员）
// ================================

/**
 * GET /news/sources
 * 获取新闻源列表
 */
router.get(
  '/sources',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await newsService.listNewsSources();
    res.json({ data: result });
  }
);

/**
 * POST /news/sources
 * 创建新闻源
 */
router.post(
  '/sources',
  authenticate,
  adminOnly,
  validateBody(CreateNewsSourceSchema),
  async (req: Request, res: Response) => {
    const result = await newsService.createNewsSource(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * PATCH /news/sources/:id
 * 更新新闻源
 */
router.patch(
  '/sources/:id',
  authenticate,
  adminOnly,
  validateBody(UpdateNewsSourceSchema),
  async (req: Request, res: Response) => {
    const result = await newsService.updateNewsSource(req.params.id, req.body, req.user!.userId);
    res.json(result);
  }
);

/**
 * DELETE /news/sources/:id
 * 删除新闻源
 */
router.delete(
  '/sources/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    await newsService.deleteNewsSource(req.params.id, req.user!.userId);
    res.status(204).send();
  }
);

/**
 * POST /news/sources/:id/fetch
 * 手动触发新闻源抓取
 * PRD 6.6.5: 管理员可以手动触发抓取
 */
router.post(
  '/sources/:id/fetch',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const result = await triggerNewsFetch(req.params.id);
    res.json(result);
  }
);

/**
 * POST /news/sources/fetch-all
 * 手动触发所有新闻源抓取
 */
router.post(
  '/sources/fetch-all',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await triggerNewsFetch();
    res.json(result);
  }
);

/**
 * POST /news/refresh
 * 管理员刷新新闻（简化API，前端按钮调用）
 * 抓取所有新闻源并自动关联到项目
 */
router.post(
  '/refresh',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await triggerNewsFetch();
    res.json({
      success: result.success,
      message: result.success 
        ? `抓取完成，新增 ${result.insertedCount === -1 ? '多条' : result.insertedCount + '条'}新闻，关联 ${result.linkedCount} 条到项目`
        : '抓取失败',
      ...result,
    });
  }
);

export { router as newsRouter };

