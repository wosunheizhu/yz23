/**
 * 日历聚合路由 - Node 5
 * PRD 23.2: 日历聚合 API
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { getRoleLevel } from '../../utils/visibility.js';
import { ListCalendarEventsQuerySchema } from './calendar.dto.js';
import * as calendarService from './calendar.service.js';
import { z } from 'zod';

const router: Router = Router();

/**
 * GET /calendar/events
 * 获取日历事件列表
 */
router.get(
  '/events',
  authenticate,
  validateQuery(ListCalendarEventsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await calendarService.listCalendarEvents(
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
 * GET /calendar/month-summary
 * 获取月份摘要
 */
router.get(
  '/month-summary',
  authenticate,
  validateQuery(
    z.object({
      year: z.string().transform((v) => parseInt(v, 10)),
      month: z.string().transform((v) => parseInt(v, 10)),
      venueId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, month, venueId } = req.query as {
        year: number;
        month: number;
        venueId?: string;
      };
      const result = await calendarService.getMonthSummary(
        year,
        month,
        venueId,
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
 * GET /calendar/upcoming
 * 获取即将到来的事件
 */
router.get(
  '/upcoming',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const result = await calendarService.getUpcomingEvents(
        req.user!.userId,
        getRoleLevel(req.user!.roleLevel),
        req.user!.isAdmin,
        days
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /calendar/my-events
 * 获取我的事件
 */
router.get(
  '/my-events',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = req.query.from
        ? new Date(req.query.from as string)
        : new Date();
      const to = req.query.to
        ? new Date(req.query.to as string)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 默认30天

      const result = await calendarService.getMyEvents(
        req.user!.userId,
        getRoleLevel(req.user!.roleLevel),
        req.user!.isAdmin,
        from,
        to
      );
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as calendarRouter };
