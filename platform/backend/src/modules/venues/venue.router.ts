/**
 * 场地管理路由 - Node 5
 * PRD 23.1: Venue（场地）API
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  CreateVenueSchema,
  UpdateVenueSchema,
  ListVenuesQuerySchema,
} from './venue.dto.js';
import * as venueService from './venue.service.js';

const router: Router = Router();

/**
 * GET /venues
 * 获取场地列表（所有已认证用户可访问）
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListVenuesQuerySchema),
  async (req: Request, res: Response) => {
    const result = await venueService.listVenues(req.query as never);
    res.json(result);
  }
);

/**
 * GET /venues/active
 * 获取可用场地列表（用于预约/会议选择）
 */
router.get(
  '/active',
  authenticate,
  async (_req: Request, res: Response) => {
    const result = await venueService.getActiveVenues();
    res.json({ data: result });
  }
);

/**
 * GET /venues/stats
 * 获取场地统计信息（仅管理员）
 */
router.get(
  '/stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response) => {
    const result = await venueService.getVenueStats();
    res.json(result);
  }
);

/**
 * GET /venues/:id
 * 获取单个场地详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const result = await venueService.getVenueById(req.params.id);
    res.json(result);
  }
);

/**
 * POST /admin/venues
 * 创建场地（仅管理员）
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  validateBody(CreateVenueSchema),
  async (req: Request, res: Response) => {
    const result = await venueService.createVenue(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * PATCH /admin/venues/:id
 * 更新场地（仅管理员）
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  validateBody(UpdateVenueSchema),
  async (req: Request, res: Response) => {
    const result = await venueService.updateVenue(
      req.params.id,
      req.body,
      req.user!.userId
    );
    res.json(result);
  }
);

/**
 * POST /admin/venues/:id/disable
 * 停用场地（仅管理员）
 */
router.post(
  '/:id/disable',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const result = await venueService.disableVenue(req.params.id, req.user!.userId);
    res.json(result);
  }
);

/**
 * POST /admin/venues/:id/enable
 * 启用场地（仅管理员）
 */
router.post(
  '/:id/enable',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const result = await venueService.enableVenue(req.params.id, req.user!.userId);
    res.json(result);
  }
);

/**
 * POST /admin/venues/:id/maintenance
 * 设置场地为维护状态（仅管理员）
 */
router.post(
  '/:id/maintenance',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    const result = await venueService.setVenueMaintenance(
      req.params.id,
      req.user!.userId
    );
    res.json(result);
  }
);

export { router as venueRouter };

