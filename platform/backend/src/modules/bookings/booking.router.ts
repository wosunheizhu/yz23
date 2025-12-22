/**
 * 场地预约路由 - Node 5
 * PRD 23.3: VenueBooking（场地预约）API
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { getRoleLevel } from '../../utils/visibility.js';
import {
  CreateBookingSchema,
  UpdateBookingSchema,
  CancelBookingSchema,
  AdminOverrideSchema,
  ListBookingsQuerySchema,
  CheckConflictSchema,
} from './booking.dto.js';
import * as bookingService from './booking.service.js';

const router: Router = Router();

/**
 * GET /bookings
 * 获取预约列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListBookingsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.listBookings(
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
 * POST /bookings/check-conflict
 * 检查时间冲突
 */
router.post(
  '/check-conflict',
  authenticate,
  validateBody(CheckConflictSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.checkVenueConflict(req.body);
      
      // PRD: 冲突则拒绝并提示可选时间
      if (result.hasConflict) {
        const startTime = new Date(req.body.startTime);
        const endTime = new Date(req.body.endTime);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
        
        const suggestedSlots = await bookingService.getSuggestedSlots(
          req.body.venueId,
          startTime,
          durationMinutes
        );
        
        res.json({ ...result, suggestedSlots });
      } else {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /bookings/:id
 * 获取单个预约详情
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.getBookingById(
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
 * POST /bookings
 * 创建场地预约
 */
router.post(
  '/',
  authenticate,
  validateBody(CreateBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.createBooking(
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
 * PATCH /bookings/:id
 * 更新预约
 */
router.patch(
  '/:id',
  authenticate,
  validateBody(UpdateBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.updateBooking(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /bookings/:id/cancel
 * 取消预约
 */
router.post(
  '/:id/cancel',
  authenticate,
  validateBody(CancelBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.cancelBooking(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /bookings/:id/finish
 * 完成预约
 */
router.post(
  '/:id/finish',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.finishBooking(
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

/**
 * POST /admin/bookings/:id/override
 * 管理员强制覆盖（仅管理员）
 */
router.post(
  '/:id/override',
  authenticate,
  adminOnly,
  validateBody(AdminOverrideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookingService.adminOverride(
        req.params.id,
        req.body,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export { router as bookingRouter };
