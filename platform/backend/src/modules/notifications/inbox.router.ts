/**
 * 站内信箱路由 - Node 8
 * PRD 23.6: 通知（站内 + 邮件）API
 */

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery, validateBody } from '../../middleware/validate.js';
import {
  ListInboxQuerySchema,
  MarkReadSchema,
  InboxCategorySchema,
} from './inbox.dto.js';
import * as inboxService from './inbox.service.js';
import * as notificationService from './notification.service.js';

const router: Router = Router();

// ================================
// 信箱消息
// ================================

/**
 * GET /inbox
 * 获取用户信箱列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListInboxQuerySchema),
  async (req: Request, res: Response) => {
    const result = await inboxService.listInboxItems(
      req.user!.userId,
      req.query as never
    );
    res.json(result);
  }
);

/**
 * GET /inbox/unread-count
 * 获取未读数量统计
 */
router.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await inboxService.getUnreadCount(req.user!.userId);
    res.json(result);
  }
);

/**
 * GET /inbox/:id
 * 获取单条信箱消息
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await inboxService.getInboxItemById(
      req.params.id,
      req.user!.userId
    );
    if (!result) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }
    res.json(result);
  }
);

/**
 * POST /inbox/:id/read
 * 标记单条为已读
 */
router.post(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await inboxService.markAsRead(req.params.id, req.user!.userId);
    if (!result) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }
    res.json(result);
  }
);

/**
 * POST /inbox/read-batch
 * 批量标记为已读
 */
router.post(
  '/read-batch',
  authenticate,
  validateBody(MarkReadSchema),
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      res.status(400).json({ error: '请提供消息ID' });
      return;
    }
    const count = await inboxService.markMultipleAsRead(ids, req.user!.userId);
    res.json({ count });
  }
);

/**
 * POST /inbox/read-all
 * 全部标记为已读
 */
router.post(
  '/read-all',
  authenticate,
  async (req: Request, res: Response) => {
    const categoryResult = InboxCategorySchema.safeParse(req.query.category);
    const category = categoryResult.success ? categoryResult.data : undefined;
    
    const count = await inboxService.markAllAsRead(req.user!.userId, category);
    res.json({ count });
  }
);

/**
 * DELETE /inbox/:id
 * 删除信箱消息
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const success = await inboxService.deleteInboxItem(
      req.params.id,
      req.user!.userId
    );
    if (!success) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }
    res.status(204).send();
  }
);

// ================================
// 通知偏好
// ================================

/**
 * GET /inbox/preferences
 * 获取通知偏好
 */
router.get(
  '/preferences',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await notificationService.getPreference(req.user!.userId);
    res.json(result);
  }
);

/**
 * PUT /inbox/preferences
 * 更新通知偏好
 */
router.put(
  '/preferences',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await notificationService.updatePreference(
      req.user!.userId,
      req.body
    );
    res.json(result);
  }
);

export { router as inboxRouter };

