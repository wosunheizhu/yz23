/**
 * 需求路由
 * 元征 · 合伙人赋能平台
 */

import { Router, Request, Response, NextFunction } from 'express';
import { 
  createDemand, 
  listDemands, 
  getDemandById,
  updateDemand,
  closeDemand,
  cancelDemand,
  getDemandsByProject,
} from './demand.service.js';
import { 
  createDemandSchema, 
  updateDemandSchema,
  closeDemandSchema,
  cancelDemandSchema,
  listDemandsQuerySchema,
} from './demand.dto.js';
import { authenticate } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router: Router = Router();

/**
 * 获取需求列表
 * GET /demands
 */
router.get(
  '/',
  authenticate,
  validateRequest({ query: listDemandsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const { userId, roleLevel, isAdmin } = req.user!;
      const result = await listDemands(query, userId, roleLevel, isAdmin);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 创建需求
 * POST /demands
 */
router.post(
  '/',
  authenticate,
  validateRequest({ body: createDemandSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const demand = await createDemand(req.body, userId);
      res.status(201).json({ success: true, data: demand });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取需求详情
 * GET /demands/:id
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const demand = await getDemandById(req.params.id, userId, roleLevel, isAdmin);
      res.json({ success: true, data: demand });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 更新需求
 * PUT /demands/:id
 */
router.put(
  '/:id',
  authenticate,
  validateRequest({ body: updateDemandSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const demand = await updateDemand(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: demand });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 关闭需求（正常完成）
 * POST /demands/:id/close
 */
router.post(
  '/:id/close',
  authenticate,
  validateRequest({ body: closeDemandSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const demand = await closeDemand(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: demand });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 取消需求（提前终止）
 * POST /demands/:id/cancel
 */
router.post(
  '/:id/cancel',
  authenticate,
  validateRequest({ body: cancelDemandSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const demand = await cancelDemand(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: demand });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取项目的所有需求
 * GET /demands/project/:projectId
 */
router.get(
  '/project/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const demands = await getDemandsByProject(
        req.params.projectId, 
        userId, 
        roleLevel, 
        isAdmin
      );
      res.json({ success: true, data: demands });
    } catch (error) {
      next(error);
    }
  }
);

export { router as demandRouter };

