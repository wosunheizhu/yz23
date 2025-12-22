/**
 * 站内信箱路由 - Node 10
 * PRD 18.1: 站内信箱
 */

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { ListInboxQuerySchema, type InboxCategory } from './inbox.dto.js';
import * as inboxService from './inbox.service.js';

const router: Router = Router();

// ================================
// 信箱相关
// ================================

/**
 * GET /inbox
 * 获取信箱列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListInboxQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const result = await inboxService.listInbox(req.query as never, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /inbox/stats
 * 获取信箱统计
 */
router.get('/stats', authenticate, async (req: Request, res: Response, next) => {
  try {
    const result = await inboxService.getInboxStats(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /inbox/:id
 * 获取单个信箱项
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const result = await inboxService.getInboxItemById(req.params.id, req.user!.userId);
    if (!result) {
      res.status(404).json({ error: '信箱项不存在' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /inbox/:id/read
 * 标记单个信箱项已读
 */
router.post('/:id/read', authenticate, async (req: Request, res: Response, next) => {
  try {
    await inboxService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /inbox/read-all
 * 标记全部已读（可选分类，支持query或body参数）
 */
router.post('/read-all', authenticate, async (req: Request, res: Response, next) => {
  try {
    const category = (req.query.category || req.body?.category) as InboxCategory | undefined;
    const count = await inboxService.markAllAsRead(req.user!.userId, category);
    res.json({ success: true, markedCount: count });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /inbox/:id
 * 删除单个信箱项
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    await inboxService.deleteInboxItem(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /inbox/clear-read
 * 清空所有已读消息
 */
router.delete('/clear-read', authenticate, async (req: Request, res: Response, next) => {
  try {
    const count = await inboxService.deleteAllRead(req.user!.userId);
    res.json({ success: true, deletedCount: count });
  } catch (error) {
    next(error);
  }
});

export { router as inboxRouter };

