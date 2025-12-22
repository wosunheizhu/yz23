/**
 * 公司座谈会路由 - Node 5
 * PRD 23.4: CompanyMeeting（公司座谈会）API
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { getRoleLevelValue as getRoleLevel } from '../../utils/visibility.js';
import {
  CreateMeetingSchema,
  UpdateMeetingSchema,
  AddParticipantSchema,
  UpdateParticipantSchema,
  AddGuestSchema,
  UpdateGuestSchema,
  UpdateMinutesSchema,
  ListMeetingsQuerySchema,
} from './meeting.dto.js';
import * as meetingService from './meeting.service.js';

const router: Router = Router();

// ================================
// 会议 CRUD
// ================================

/**
 * GET /company-meetings
 * 获取会议列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListMeetingsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.listMeetings(
        req.query as never,
        req.user!.userId,
        getRoleLevel(req.user!.roleLevel),
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /company-meetings/:id
 * 获取单个会议详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.getMeetingById(
        req.params.id,
        req.user!.userId,
        getRoleLevel(req.user!.roleLevel),
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /company-meetings
 * 创建会议
 */
router.post(
  '/',
  authenticate,
  validateBody(CreateMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.createMeeting(
        req.body,
        req.user!.userId,
        req.user!.isAdmin,
        getRoleLevel(req.user!.roleLevel)
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /company-meetings/:id
 * 更新会议
 */
router.patch(
  '/:id',
  authenticate,
  validateBody(UpdateMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.updateMeeting(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /company-meetings/:id/cancel
 * 取消会议
 */
router.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.cancelMeeting(
        req.params.id,
        req.user!.userId,
        req.user!.isAdmin,
        req.body.reason
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /company-meetings/:id/finish
 * 结束会议（触发 Token 发放任务生成）
 */
router.post(
  '/:id/finish',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.finishMeeting(
        req.params.id,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 参与者管理
// ================================

/**
 * POST /company-meetings/:id/participants
 * 添加参与者
 */
router.post(
  '/:id/participants',
  authenticate,
  validateBody(AddParticipantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.addParticipant(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /company-meetings/:id/participants/:userId
 * 更新参与者状态
 */
router.patch(
  '/:id/participants/:userId',
  authenticate,
  validateBody(UpdateParticipantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.updateParticipant(
        req.params.id,
        req.params.userId,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /company-meetings/:id/participants/:userId
 * 移除参与者
 */
router.delete(
  '/:id/participants/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await meetingService.removeParticipant(
        req.params.id,
        req.params.userId,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 外部嘉宾管理
// ================================

/**
 * POST /company-meetings/:id/guests
 * 添加外部嘉宾
 */
router.post(
  '/:id/guests',
  authenticate,
  validateBody(AddGuestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.addGuest(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /guests/:guestId
 * 更新外部嘉宾（注意路径不在 meetings 下）
 */
router.patch(
  '/guests/:guestId',
  authenticate,
  validateBody(UpdateGuestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.updateGuest(
        req.params.guestId,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /guests/:guestId
 * 删除外部嘉宾（软删除）
 */
router.delete(
  '/guests/:guestId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await meetingService.deleteGuest(
        req.params.guestId,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 会议纪要
// ================================

/**
 * GET /company-meetings/:id/minutes
 * 获取会议纪要
 */
router.get(
  '/:id/minutes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.getMinutes(
        req.params.id,
        req.user!.userId,
        getRoleLevel(req.user!.roleLevel),
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /company-meetings/:id/minutes
 * 更新会议纪要
 */
router.put(
  '/:id/minutes',
  authenticate,
  validateBody(UpdateMinutesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.updateMinutes(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// PRD 19.6.3: 嘉宾补录完成度统计
// ================================

/**
 * GET /company-meetings/:id/guest-completion
 * 获取单个会议的嘉宾补录完成度（仅管理员）
 */
router.get(
  '/:id/guest-completion',
  authenticate,
  adminOnly,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.getGuestCompletionStats(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /company-meetings/admin/guest-completion-stats
 * 获取所有已结束会议的嘉宾补录统计（仅管理员）
 */
router.get(
  '/admin/guest-completion-stats',
  authenticate,
  adminOnly,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.getAllGuestCompletionStats();
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 人脉资源关联
// ================================

/**
 * POST /company-meetings/:id/network-links
 * 关联人脉资源到会议
 */
router.post(
  '/:id/network-links',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await meetingService.linkNetworkResource(
        req.params.id,
        req.body.networkResourceId,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /company-meetings/:id/network-links
 * 获取会议关联的人脉资源
 */
router.get(
  '/:id/network-links',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await meetingService.getMeetingNetworkLinks(req.params.id);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /company-meetings/:id/network-links/:resourceId
 * 移除人脉资源关联
 */
router.delete(
  '/:id/network-links/:resourceId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await meetingService.unlinkNetworkResource(
        req.params.id,
        req.params.resourceId,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { router as meetingRouter };

