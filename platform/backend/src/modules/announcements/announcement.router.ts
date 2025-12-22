/**
 * 公告管理路由 - Node 9
 * PRD 6.12: 公告管理模块（管理员）
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  ListAnnouncementsQuerySchema,
} from './announcement.dto.js';
import * as announcementService from './announcement.service.js';

const router: Router = Router();

// ================================
// 公开接口（已认证用户）
// ================================

/**
 * GET /announcements
 * 获取用户可见的公告列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListAnnouncementsQuerySchema),
  async (req: Request, res: Response, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      
      // 获取用户角色级别
      const roleLevelMap: Record<string, number> = {
        FOUNDER: 3,
        CORE_PARTNER: 2,
        PARTNER: 1,
      };
      const roleLevel = roleLevelMap[req.user!.roleLevel] || 0;
      
      const result = await announcementService.listVisibleAnnouncements(
        req.user!.userId,
        roleLevel,
        page,
        pageSize
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /announcements/:id
 * 获取公告详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await announcementService.getAnnouncementById(req.params.id);
  if (!result) {
    res.status(404).json({ error: '公告不存在' });
    return;
  }
  res.json(result);
});

// ================================
// 管理员接口
// ================================

/**
 * GET /announcements/admin/list
 * 获取所有公告列表（管理员）
 */
router.get(
  '/admin/list',
  authenticate,
  adminOnly,
  validateQuery(ListAnnouncementsQuerySchema),
  async (req: Request, res: Response) => {
    const result = await announcementService.listAnnouncements(req.query as never);
    res.json(result);
  }
);

/**
 * POST /announcements
 * 创建公告（仅管理员）
 */
router.post(
  '/',
  authenticate,
  adminOnly,
  validateBody(CreateAnnouncementSchema),
  async (req: Request, res: Response) => {
    const result = await announcementService.createAnnouncement(
      req.body,
      req.user!.userId
    );
    res.status(201).json(result);
  }
);

/**
 * PATCH /announcements/:id
 * 更新公告（仅管理员）
 */
router.patch(
  '/:id',
  authenticate,
  adminOnly,
  validateBody(UpdateAnnouncementSchema),
  async (req: Request, res: Response) => {
    const result = await announcementService.updateAnnouncement(
      req.params.id,
      req.body,
      req.user!.userId
    );
    res.json(result);
  }
);

/**
 * DELETE /announcements/:id
 * 删除公告（仅管理员）
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    await announcementService.deleteAnnouncement(req.params.id, req.user!.userId);
    res.status(204).send();
  }
);

export { router as announcementRouter };

