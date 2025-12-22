/**
 * 管理员控制台路由 - Node 9
 * PRD 22: 管理员控制台（v3 增量）
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateQuery, validateBody } from '../../middleware/validate.js';
import {
  ListAuditLogsQuerySchema,
  VenueOccupancyQuerySchema,
  AdminBookingListQuerySchema,
  ProjectReviewSchema,
  ResponseArbitrationSchema,
  UpdateSystemConfigSchema,
} from './admin.dto.js';
import * as adminService from './admin.service.js';
import * as projectService from '../projects/project.service.js';
import * as responseService from '../responses/response.service.js';
import { ReviewProjectDto } from '../projects/project.dto.js';

const router: Router = Router();

// 所有路由需要管理员权限
router.use(authenticate);
router.use(adminOnly);

// ================================
// 仪表盘
// ================================

/**
 * GET /admin/dashboard/stats
 * 获取仪表盘统计
 */
router.get('/dashboard/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/dashboard/quick-actions
 * 获取快捷操作数据
 */
router.get('/dashboard/quick-actions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const actions = await adminService.getQuickActions();
    res.json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
});

// ================================
// 审计日志
// ================================

/**
 * GET /admin/audit-logs
 * 获取审计日志列表
 */
router.get(
  '/audit-logs',
  validateQuery(ListAuditLogsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.listAuditLogs(req.query as never);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 场地管理
// ================================

/**
 * GET /admin/venues/occupancy
 * 获取场地占用率统计
 */
router.get(
  '/venues/occupancy',
  validateQuery(VenueOccupancyQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.getVenueOccupancy(req.query as never);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 预约管理
// ================================

/**
 * GET /admin/bookings
 * 获取预约管理列表
 */
router.get(
  '/bookings',
  validateQuery(AdminBookingListQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.listAdminBookings(req.query as never);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/bookings/export
 * 导出预约列表为 CSV
 */
router.get(
  '/bookings/export',
  validateQuery(AdminBookingListQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csvContent = await adminService.exportBookingsToCSV(req.query as never);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 项目审核
// ================================

/**
 * GET /admin/projects/pending
 * 获取待审核项目列表
 */
router.get('/projects/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await adminService.listPendingProjects(page, pageSize);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/projects/:id/review
 * 审核项目
 */
router.post(
  '/projects/:id/review',
  validateBody(ProjectReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { approved, comment } = req.body;
      const userId = req.user!.userId;

      const dto: ReviewProjectDto = {
        action: approved ? 'approve' : 'reject',
        reason: comment,
      };

      const result = await projectService.reviewProject(id, dto, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 响应裁决
// ================================

/**
 * GET /admin/responses/pending-arbitration
 * 获取待裁决响应列表
 */
router.get('/responses/pending-arbitration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await adminService.listPendingArbitrations(page, pageSize);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/responses/:id/arbitrate
 * 裁决响应修改/废弃申请
 */
router.post(
  '/responses/:id/arbitrate',
  validateBody(ResponseArbitrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { decision, comment } = req.body;
      const userId = req.user!.userId;

      // 映射决策类型
      const decisionMap: Record<string, 'approve_modify' | 'approve_abandon' | 'continue_original'> = {
        'APPROVE_MODIFY': 'approve_modify',
        'REJECT_MODIFY': 'continue_original',
        'APPROVE_ABANDON': 'approve_abandon',
        'REJECT_ABANDON': 'continue_original',
      };

      const result = await responseService.adminArbitrate(
        id,
        decisionMap[decision] || 'continue_original',
        comment,
        undefined,
        userId
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 系统配置
// ================================

/**
 * GET /admin/config
 * 获取系统配置
 */
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await adminService.getSystemConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/config
 * 更新系统配置
 */
router.put(
  '/config',
  validateBody(UpdateSystemConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await adminService.updateSystemConfig(req.body);
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminRouter };
