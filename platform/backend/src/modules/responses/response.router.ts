/**
 * 响应路由
 * 元征 · 合伙人赋能平台
 */

import { Router, Request, Response, NextFunction } from 'express';
import { 
  createResponse, 
  listResponses, 
  getResponseById,
  reviewResponse,
  confirmUsage,
  initiateModifyOrAbandon,
  confirmModifyOrAbandon,
  adminArbitrate,
  getMyResponses,
} from './response.service.js';
import { 
  createResponseSchema, 
  reviewResponseSchema,
  confirmUsageSchema,
  modifyOrAbandonSchema,
  confirmModifyAbandonSchema,
  adminDecisionSchema,
  listResponsesQuerySchema,
} from './response.dto.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router: Router = Router();

/**
 * 获取我的响应
 * GET /responses/my
 */
router.get(
  '/my',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const responses = await getMyResponses(userId);
      res.json({ success: true, data: responses });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取响应列表
 * GET /responses
 */
router.get(
  '/',
  authenticate,
  validateRequest({ query: listResponsesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const { userId, roleLevel, isAdmin } = req.user!;
      const result = await listResponses(query, userId, roleLevel, isAdmin);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 创建响应
 * POST /responses
 */
router.post(
  '/',
  authenticate,
  validateRequest({ body: createResponseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const response = await createResponse(req.body, userId);
      res.status(201).json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取响应详情
 * GET /responses/:id
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const response = await getResponseById(req.params.id, userId, roleLevel, isAdmin);
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 审核响应
 * POST /responses/:id/review
 */
router.post(
  '/:id/review',
  authenticate,
  validateRequest({ body: reviewResponseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const response = await reviewResponse(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 确认资源已使用
 * POST /responses/:id/confirm-usage
 */
router.post(
  '/:id/confirm-usage',
  authenticate,
  validateRequest({ body: confirmUsageSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const response = await confirmUsage(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 发起修改/废弃申请
 * POST /responses/:id/modify-abandon
 */
router.post(
  '/:id/modify-abandon',
  authenticate,
  validateRequest({ body: modifyOrAbandonSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const response = await initiateModifyOrAbandon(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 资源方确认修改/废弃申请 (PRD 6.3.6.5)
 * POST /responses/:id/confirm-modify-abandon
 */
router.post(
  '/:id/confirm-modify-abandon',
  authenticate,
  validateRequest({ body: confirmModifyAbandonSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const { decision, comment } = req.body;
      const response = await confirmModifyOrAbandon(req.params.id, decision, comment, userId);
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 管理员裁决 (PRD 6.3.6.5)
 * POST /responses/:id/arbitrate
 */
router.post(
  '/:id/arbitrate',
  authenticate,
  requireAdmin,
  validateRequest({ body: adminDecisionSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const { decision, comment, finalSharePercentage, finalTokenAmount, finalOther } = req.body;
      const response = await adminArbitrate(
        req.params.id, 
        decision, 
        comment,
        { sharePercentage: finalSharePercentage, tokenAmount: finalTokenAmount, other: finalOther },
        userId
      );
      res.json({ success: true, data: response });
    } catch (error) {
      next(error);
    }
  }
);

export { router as responseRouter };

