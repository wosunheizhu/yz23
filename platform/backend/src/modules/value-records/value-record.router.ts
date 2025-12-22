/**
 * 价值记录路由
 * 元征 · 合伙人赋能平台
 * 
 * 所有操作仅限管理员
 */

import { Router, Request, Response, NextFunction } from 'express';
import { 
  createValueRecord, 
  listValueRecords, 
  getValueRecordById,
  updateValueRecord,
  deleteValueRecord,
  getValueStats,
} from './value-record.service.js';
import { 
  createValueRecordSchema, 
  updateValueRecordSchema,
  listValueRecordsQuerySchema,
} from './value-record.dto.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router: Router = Router();

/**
 * 获取价值统计（公开给所有登录用户，用于仪表盘）
 * GET /value-records/stats
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getValueStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取价值记录列表（管理员）
 * GET /value-records
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  validateRequest({ query: listValueRecordsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const result = await listValueRecords(query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 创建价值记录（管理员）
 * POST /value-records
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateRequest({ body: createValueRecordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const record = await createValueRecord(req.body, userId);
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取价值记录详情（管理员）
 * GET /value-records/:id
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await getValueRecordById(req.params.id);
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 更新价值记录（管理员）
 * PUT /value-records/:id
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateRequest({ body: updateValueRecordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const record = await updateValueRecord(req.params.id, req.body, userId);
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 删除价值记录（管理员）
 * DELETE /value-records/:id
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const result = await deleteValueRecord(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as valueRecordRouter };






