/**
 * 人脉资源模块 Router
 * Node 4: 人脉资源体系
 * 
 * API 端点:
 * 
 * 人脉资源:
 * - POST   /network-resources              - 创建人脉资源
 * - GET    /network-resources              - 获取人脉资源列表
 * - GET    /network-resources/:id          - 获取人脉资源详情
 * - PUT    /network-resources/:id          - 更新人脉资源
 * - DELETE /network-resources/:id          - 删除人脉资源
 * - PATCH  /network-resources/:id/contact-status - 更新联系进展状态
 * - POST   /network-resources/check-duplicate - 检查重复
 * - POST   /network-resources/link         - 关联到业务对象
 * - POST   /network-resources/unlink       - 取消关联
 * - GET    /network-resources/:id/links    - 获取关联对象
 * 
 * 引荐记录:
 * - POST   /referrals                      - 创建引荐记录
 * - GET    /referrals                      - 获取引荐记录列表
 * - GET    /referrals/:id                  - 获取引荐记录详情
 * 
 * 统计:
 * - GET    /network-resources/my-contribution - 我的贡献统计
 * - GET    /network-resources/admin/stats     - 管理员平台统计
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createNetworkResourceSchema,
  updateNetworkResourceSchema,
  listNetworkResourcesQuerySchema,
  checkDuplicateSchema,
  updateContactStatusSchema,
  linkToObjectSchema,
  createReferralSchema,
  listReferralsQuerySchema,
} from './network-resource.dto.js';
import * as networkResourceService from './network-resource.service.js';

const router: Router = Router();

// ================================
// 人脉资源
// ================================

/**
 * POST /network-resources
 * 创建人脉资源
 */
router.post(
  '/',
  authenticate,
  validateBody(createNetworkResourceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await networkResourceService.createNetworkResource(
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin,
        req.body
      );
      res.status(201).json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources
 * 获取人脉资源列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(listNetworkResourcesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await networkResourceService.listNetworkResources(
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin,
        req.query as any
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/my-contribution
 * 我的贡献统计
 */
router.get(
  '/my-contribution',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await networkResourceService.getMyContributionStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/admin/stats
 * 管理员平台统计
 */
router.get(
  '/admin/stats',
  authenticate,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await networkResourceService.getPlatformStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /network-resources/check-duplicate
 * 检查重复
 */
router.post(
  '/check-duplicate',
  authenticate,
  validateBody(checkDuplicateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await networkResourceService.checkDuplicate(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /network-resources/link
 * 关联到业务对象
 */
router.post(
  '/link',
  authenticate,
  validateBody(linkToObjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await networkResourceService.linkToObject(req.user!.userId, req.body);
      res.json({ success: true, message: '关联成功' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /network-resources/unlink
 * 取消关联
 */
router.post(
  '/unlink',
  authenticate,
  validateBody(linkToObjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await networkResourceService.unlinkFromObject(req.user!.userId, req.body);
      res.json({ success: true, message: '取消关联成功' });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 引荐记录 (必须在 /:id 路由之前定义)
// ================================

/**
 * POST /network-resources/referrals
 * 创建引荐记录
 */
router.post(
  '/referrals',
  authenticate,
  validateBody(createReferralSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const referral = await networkResourceService.createReferral(
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin,
        req.body
      );
      res.status(201).json({ success: true, data: referral });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/referrals
 * 获取引荐记录列表
 */
router.get(
  '/referrals',
  authenticate,
  validateQuery(listReferralsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await networkResourceService.listReferrals(
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin,
        req.query as any
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/referrals/:id
 * 获取引荐记录详情
 */
router.get(
  '/referrals/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const referral = await networkResourceService.getReferral(
        req.params.id,
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin
      );
      res.json({ success: true, data: referral });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/:id
 * 获取人脉资源详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await networkResourceService.getNetworkResource(
        req.params.id,
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin
      );
      res.json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /network-resources/:id
 * 更新人脉资源
 */
router.put(
  '/:id',
  authenticate,
  validateBody(updateNetworkResourceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await networkResourceService.updateNetworkResource(
        req.params.id,
        req.user!.userId,
        req.user!.roleLevel,
        req.user!.isAdmin,
        req.body
      );
      res.json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /network-resources/:id
 * 删除人脉资源（软删除）
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await networkResourceService.deleteNetworkResource(
        req.params.id,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ success: true, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /network-resources/:id/contact-status
 * 更新联系进展状态 (PRD 10.3)
 */
router.patch(
  '/:id/contact-status',
  authenticate,
  validateBody(updateContactStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await networkResourceService.updateContactStatus(
        req.params.id,
        req.user!.userId,
        req.user!.isAdmin,
        req.body
      );
      res.json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /network-resources/:id/links
 * 获取资源的关联对象
 */
router.get(
  '/:id/links',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const links = await networkResourceService.getResourceLinks(req.params.id);
      res.json({ success: true, data: links });
    } catch (error) {
      next(error);
    }
  }
);

export { router as networkResourceRouter };

