/**
 * 意见反馈路由 - Node 9
 * PRD 6.9.2: 意见反馈（Feedback）
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  CreateFeedbackSchema,
  ProcessFeedbackSchema,
  ListFeedbacksQuerySchema,
} from './feedback.dto.js';
import * as feedbackService from './feedback.service.js';

const router: Router = Router();

// ================================
// 用户接口
// ================================

/**
 * GET /feedbacks/my
 * 获取我的反馈列表
 */
router.get('/my', authenticate, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const result = await feedbackService.listMyFeedbacks(req.user!.userId, page, pageSize);
  res.json(result);
});

/**
 * GET /feedbacks/:id
 * 获取反馈详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await feedbackService.getFeedbackById(req.params.id);
  if (!result) {
    res.status(404).json({ error: '反馈不存在' });
    return;
  }
  // 只能查看自己的反馈或管理员查看
  if (result.userId !== req.user!.userId && !req.user!.isAdmin) {
    res.status(403).json({ error: '无权查看此反馈' });
    return;
  }
  res.json(result);
});

/**
 * POST /feedbacks
 * 提交意见反馈
 */
router.post(
  '/',
  authenticate,
  validateBody(CreateFeedbackSchema),
  async (req: Request, res: Response) => {
    const result = await feedbackService.createFeedback(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

// ================================
// 管理员接口
// ================================

/**
 * GET /feedbacks/admin/list
 * 获取所有反馈列表（管理员）
 */
router.get(
  '/admin/list',
  authenticate,
  adminOnly,
  validateQuery(ListFeedbacksQuerySchema),
  async (req: Request, res: Response) => {
    const result = await feedbackService.listFeedbacks(req.query as never);
    res.json(result);
  }
);

/**
 * GET /feedbacks/admin/stats
 * 获取反馈统计（管理员）
 */
router.get(
  '/admin/stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await feedbackService.getFeedbackStats();
    res.json(result);
  }
);

/**
 * POST /feedbacks/:id/process
 * 处理反馈（管理员）
 */
router.post(
  '/:id/process',
  authenticate,
  adminOnly,
  validateBody(ProcessFeedbackSchema),
  async (req: Request, res: Response) => {
    const result = await feedbackService.processFeedback(
      req.params.id,
      req.body,
      req.user!.userId
    );
    res.json(result);
  }
);

export { router as feedbackRouter };

