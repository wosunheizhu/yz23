/**
 * 项目路由
 * 元征 · 合伙人赋能平台
 */

import { Router, Request, Response, NextFunction } from 'express';
import { 
  createProject, 
  listProjects, 
  getProjectById,
  updateProject,
  reviewProject,
  getPendingProjects,
  getProjectStats,
  getProjectEvents,
  requestJoinProject,
  getJoinRequests,
  reviewJoinRequest,
  addProjectEvent,
  correctProjectEvent,
  addMember,
  removeMember,
  updateMemberRole,
  adjustShares,
  changeBusinessStatus,
} from './project.service.js';
import { 
  createProjectSchema, 
  updateProjectSchema,
  reviewProjectSchema,
  listProjectsQuerySchema,
  joinProjectSchema,
  reviewJoinRequestSchema,
  createProjectEventSchema,
  correctEventSchema,
  addMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  adjustSharesSchema,
  changeBusinessStatusSchema,
} from './project.dto.js';
import { 
  authenticate, 
  requireAdmin, 
  requireFounder 
} from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';

const router: Router = Router();

/**
 * 获取项目统计（管理员）
 * GET /projects/stats
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getProjectStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取待审核项目（管理员）
 * GET /projects/pending
 */
router.get(
  '/pending',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await getPendingProjects();
      res.json({ success: true, data: projects });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取项目列表
 * GET /projects
 */
router.get(
  '/',
  authenticate,
  validateRequest({ query: listProjectsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const { userId, roleLevel, isAdmin } = req.user!;
      const result = await listProjects(query, userId, roleLevel, isAdmin);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 创建项目
 * POST /projects
 * 只有联合创始人或管理员可发起
 */
router.post(
  '/',
  authenticate,
  validateRequest({ body: createProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const project = await createProject(req.body, userId, roleLevel, isAdmin);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取项目详情
 * GET /projects/:id
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const project = await getProjectById(req.params.id, userId, roleLevel, isAdmin);
      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 更新项目
 * PUT /projects/:id
 */
router.put(
  '/:id',
  authenticate,
  validateRequest({ body: updateProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const project = await updateProject(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 审核项目（管理员）
 * POST /projects/:id/review
 */
router.post(
  '/:id/review',
  authenticate,
  requireAdmin,
  validateRequest({ body: reviewProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const project = await reviewProject(req.params.id, req.body, userId);
      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取项目时间线
 * GET /projects/:id/events
 */
router.get(
  '/:id/events',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, roleLevel, isAdmin } = req.user!;
      const events = await getProjectEvents(req.params.id, userId, roleLevel, isAdmin);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 加入项目申请 (PRD 6.3.4)
// ================================

/**
 * 申请加入项目
 * POST /projects/:id/join
 */
router.post(
  '/:id/join',
  authenticate,
  validateRequest({ body: joinProjectSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user!;
      const result = await requestJoinProject(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 获取项目的加入申请列表
 * GET /projects/:id/join-requests
 */
router.get(
  '/:id/join-requests',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const requests = await getJoinRequests(req.params.id, userId, isAdmin);
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 审批加入申请
 * POST /projects/join-requests/:requestId/review
 */
router.post(
  '/join-requests/:requestId/review',
  authenticate,
  validateRequest({ body: reviewJoinRequestSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await reviewJoinRequest(req.params.requestId, req.body, userId, isAdmin);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 项目进程记录 (PRD 6.3.8)
// ================================

/**
 * 新建项目进程记录
 * POST /projects/:id/events
 */
router.post(
  '/:id/events',
  authenticate,
  validateRequest({ body: createProjectEventSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const event = await addProjectEvent(req.params.id, req.body, userId, isAdmin);
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 添加更正事件
 * POST /projects/:id/events/correct
 */
router.post(
  '/:id/events/correct',
  authenticate,
  validateRequest({ body: correctEventSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const event = await correctProjectEvent(req.params.id, req.body, userId, isAdmin);
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 成员管理
// ================================

/**
 * 直接添加项目成员（管理员/负责人操作）
 * POST /projects/:id/members/add
 */
router.post(
  '/:id/members/add',
  authenticate,
  validateRequest({ body: addMemberSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await addMember(req.params.id, req.body, userId, isAdmin);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 移除项目成员
 * POST /projects/:id/members/remove
 */
router.post(
  '/:id/members/remove',
  authenticate,
  validateRequest({ body: removeMemberSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await removeMember(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 更新成员角色
 * POST /projects/:id/members/role
 */
router.post(
  '/:id/members/role',
  authenticate,
  validateRequest({ body: updateMemberRoleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await updateMemberRole(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 调整股权结构（管理员或项目负责人）
 * POST /projects/:id/shares
 */
router.post(
  '/:id/shares',
  authenticate,
  validateRequest({ body: adjustSharesSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await adjustShares(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 变更项目业务状态
 * POST /projects/:id/status
 */
router.post(
  '/:id/status',
  authenticate,
  validateRequest({ body: changeBusinessStatusSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, isAdmin } = req.user!;
      const result = await changeBusinessStatus(req.params.id, req.body, userId, isAdmin);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as projectRouter };

