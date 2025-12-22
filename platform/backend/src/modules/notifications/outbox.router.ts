/**
 * 通知 Outbox 管理路由（管理员）- Node 8
 * PRD 23.6: GET /admin/notification-outbox
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateQuery, validateBody } from '../../middleware/validate.js';
import { ListOutboxQuerySchema, DispatchNotificationInputSchema } from './notification.dto.js';
import * as notificationService from './notification.service.js';
import { retryFailedEmails } from './email.service.js';

const router: Router = Router();

/**
 * GET /admin/notification-outbox
 * 获取 Outbox 列表
 */
router.get(
  '/',
  authenticate,
  adminOnly,
  validateQuery(ListOutboxQuerySchema),
  async (req: Request, res: Response) => {
    const result = await notificationService.listOutbox(req.query as never);
    res.json(result);
  }
);

/**
 * GET /admin/notification-outbox/stats
 * 获取 Outbox 统计
 */
router.get(
  '/stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await notificationService.getOutboxStats();
    res.json(result);
  }
);

/**
 * POST /admin/notification-outbox/:id/retry
 * 重试发送失败的通知
 */
router.post(
  '/:id/retry',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const success = await notificationService.retryFailedOutbox(req.params.id);
    if (!success) {
      res.status(400).json({ error: '重试失败或通知不存在' });
      return;
    }
    res.json({ success: true });
  }
);

/**
 * POST /admin/notification-outbox/retry-all-failed
 * 批量重试所有失败的邮件
 */
router.post(
  '/retry-all-failed',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const count = await retryFailedEmails();
    res.json({ retriedCount: count });
  }
);

/**
 * POST /admin/notification-outbox/dispatch
 * 内部接口：手动分发通知（管理员）
 * PRD 23.6: POST /internal/notifications/dispatch
 */
router.post(
  '/dispatch',
  authenticate,
  adminOnly,
  validateBody(DispatchNotificationInputSchema),
  async (req: Request, res: Response) => {
    const result = await notificationService.dispatchNotification(req.body);
    res.json({
      success: true,
      inboxCount: result.inboxCount,
      emailCount: result.emailCount,
    });
  }
);

export { router as outboxRouter };

