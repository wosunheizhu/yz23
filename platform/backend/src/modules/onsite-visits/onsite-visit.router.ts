/**
 * 线下到访记录 Router
 * 用户直接记录邀请到公司线下的人员
 * 
 * API:
 * POST   /onsite-visits          创建线下到访记录
 * GET    /onsite-visits          查询列表
 * GET    /onsite-visits/my       获取我的记录
 * GET    /onsite-visits/stats    获取统计
 * GET    /onsite-visits/:id      获取详情
 * PATCH  /onsite-visits/:id      更新记录
 * DELETE /onsite-visits/:id      删除记录
 */

import { Router, Request, Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as onsiteVisitService from './onsite-visit.service.js';
import {
  CreateOnsiteVisitSchema,
  UpdateOnsiteVisitSchema,
  ListOnsiteVisitsQuerySchema,
} from './onsite-visit.dto.js';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

/**
 * POST /onsite-visits
 * 创建线下到访记录
 */
router.post(
  '/',
  validateBody(CreateOnsiteVisitSchema),
  async (req: Request, res: Response) => {
    const result = await onsiteVisitService.createOnsiteVisit(
      req.body,
      req.user!.userId
    );
    res.status(201).json(result);
  }
);

/**
 * GET /onsite-visits
 * 查询线下到访记录列表（管理员可查看所有，普通用户只能看自己的）
 */
router.get(
  '/',
  validateQuery(ListOnsiteVisitsQuerySchema),
  async (req: Request, res: Response) => {
    const result = await onsiteVisitService.listOnsiteVisits(
      req.query as any,
      req.user!.userId,
      req.user!.isAdmin
    );
    res.json(result);
  }
);

/**
 * GET /onsite-visits/my
 * 获取我的线下到访记录
 */
router.get('/my', async (req: Request, res: Response) => {
  const result = await onsiteVisitService.getMyOnsiteVisits(req.user!.userId);
  res.json(result);
});

/**
 * GET /onsite-visits/stats
 * 获取线下到访统计（管理员可查看全部，普通用户只能看自己的）
 */
router.get('/stats', async (req: Request, res: Response) => {
  const userId = req.user!.isAdmin ? undefined : req.user!.userId;
  const result = await onsiteVisitService.getOnsiteVisitStats(userId);
  res.json(result);
});

/**
 * GET /onsite-visits/:id
 * 获取线下到访记录详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  const result = await onsiteVisitService.getOnsiteVisitById(
    req.params.id,
    req.user!.userId,
    req.user!.isAdmin
  );
  res.json(result);
});

/**
 * PATCH /onsite-visits/:id
 * 更新线下到访记录
 */
router.patch(
  '/:id',
  validateBody(UpdateOnsiteVisitSchema),
  async (req: Request, res: Response) => {
    const result = await onsiteVisitService.updateOnsiteVisit(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.isAdmin
    );
    res.json(result);
  }
);

/**
 * DELETE /onsite-visits/:id
 * 删除线下到访记录
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await onsiteVisitService.deleteOnsiteVisit(
    req.params.id,
    req.user!.userId,
    req.user!.isAdmin
  );
  res.status(204).send();
});

export default router;

