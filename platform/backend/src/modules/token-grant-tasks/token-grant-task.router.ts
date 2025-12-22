/**
 * Token 发放任务路由 - Node 5
 * PRD 23.5: TokenGrantTask API
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  ApproveTaskSchema,
  RejectTaskSchema,
  ListGrantTasksQuerySchema,
} from './token-grant-task.dto.js';
import * as grantTaskService from './token-grant-task.service.js';

const router: Router = Router();

/**
 * GET /admin/token-grant-tasks
 * 获取发放任务列表（仅管理员）
 */
router.get(
  '/',
  authenticate,
  adminOnly,
  validateQuery(ListGrantTasksQuerySchema),
  async (req: Request, res: Response) => {
    const result = await grantTaskService.listGrantTasks(req.query as never);
    res.json(result);
  }
);

/**
 * GET /admin/token-grant-tasks/stats
 * 获取发放任务统计（仅管理员）
 */
router.get(
  '/stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await grantTaskService.getGrantTaskStats();
    res.json(result);
  }
);

/**
 * GET /admin/token-grant-tasks/my
 * 获取我的发放任务（作为邀请人）
 * 注意：必须在 /:id 路由之前定义，否则 /my 会被当作 id 处理
 */
router.get(
  '/my',
  authenticate,
  async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const result = await grantTaskService.getMyGrantTasks(req.user!.userId, status);
    res.json({ data: result });
  }
);

/**
 * GET /admin/token-grant-tasks/:id
 * 获取单个发放任务详情
 */
router.get(
  '/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const result = await grantTaskService.getGrantTaskById(req.params.id);
    res.json(result);
  }
);

/**
 * POST /admin/token-grant-tasks/:id/approve
 * 审核通过发放任务
 */
router.post(
  '/:id/approve',
  authenticate,
  adminOnly,
  validateBody(ApproveTaskSchema),
  async (req: Request, res: Response) => {
    const result = await grantTaskService.approveTask(
      req.params.id,
      req.body,
      req.user!.userId
    );
    res.json(result);
  }
);

/**
 * POST /admin/token-grant-tasks/:id/reject
 * 拒绝发放任务
 */
router.post(
  '/:id/reject',
  authenticate,
  adminOnly,
  validateBody(RejectTaskSchema),
  async (req: Request, res: Response) => {
    const result = await grantTaskService.rejectTask(
      req.params.id,
      req.body,
      req.user!.userId
    );
    res.json(result);
  }
);

export { router as tokenGrantTaskRouter };

