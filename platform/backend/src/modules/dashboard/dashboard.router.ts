/**
 * 用户仪表盘路由 - Node 10
 * PRD 6.8: 仪表盘模块
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { DashboardQuerySchema } from './dashboard.dto.js';
import * as dashboardService from './dashboard.service.js';

const router: Router = Router();

// ================================
// 仪表盘 API
// ================================

/**
 * GET /dashboard
 * 获取用户仪表盘数据
 * PRD 6.8: 仪表盘模块
 */
router.get(
  '/',
  authenticate,
  validateQuery(DashboardQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await dashboardService.getDashboard(
        req.user!.userId, 
        req.query as never, 
        req.user!.isAdmin || false
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /dashboard/projects
 * 获取我的项目列表
 * PRD 6.8.2: 我的项目 & 实时进程
 */
router.get('/projects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await dashboardService.getMyProjects(req.user!.userId, limit);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/todos
 * 获取我的代办事项
 * PRD 6.8.2 D3: 代办区块
 */
router.get('/todos', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await dashboardService.getMyTodos(req.user!.userId, limit);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/token
 * 获取 Token 摘要
 * PRD 6.8.3: 我的 Token & 发起交易
 */
router.get('/token', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await dashboardService.getTokenSummary(req.user!.userId, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/contributions
 * 获取我的贡献统计
 * PRD 6.8.4: 我的贡献
 */
router.get('/contributions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dashboardService.getMyContributions(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/platform-value
 * 获取平台价值曲线
 * PRD 6.8.5: 元征平台价值曲线
 */
router.get('/platform-value', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dashboardService.getPlatformValueCurve(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/inbox-badge
 * 获取信箱未读统计
 * PRD 6.8.6: 信箱入口
 */
router.get('/inbox-badge', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dashboardService.getInboxBadge(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as userDashboardRouter };

