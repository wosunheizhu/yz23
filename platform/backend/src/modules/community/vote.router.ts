/**
 * 投票路由 - Node 10
 * PRD 17.3: 投票模块
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly, requireFounder } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { getRoleLevelValue } from '../../utils/visibility.js';
import {
  CreateVoteSchema,
  UpdateVoteSchema,
  ListVotesQuerySchema,
  CastVoteSchema,
} from './vote.dto.js';
import * as voteService from './vote.service.js';

const router: Router = Router();

// ================================
// 投票相关
// ================================

/**
 * GET /votes
 * 获取投票列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListVotesQuerySchema),
  async (req: Request, res: Response) => {
    const roleLevel = getRoleLevelValue(req.user!.roleLevel);
    const result = await voteService.listVotes(req.query as never, req.user!.userId, roleLevel);
    res.json(result);
  }
);

/**
 * GET /votes/:id
 * 获取投票详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await voteService.getVoteById(req.params.id, req.user!.userId);
  if (!result) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }
  res.json(result);
});

/**
 * POST /votes
 * 发起投票（管理员/联合创始人）
 * PRD 17.3: 发起权限：管理员/联合创始人
 */
router.post(
  '/',
  authenticate,
  requireFounder,
  validateBody(CreateVoteSchema),
  async (req: Request, res: Response) => {
    const result = await voteService.createVote(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * PATCH /votes/:id
 * 更新投票
 */
router.patch(
  '/:id',
  authenticate,
  validateBody(UpdateVoteSchema),
  async (req: Request, res: Response) => {
    const result = await voteService.updateVote(req.params.id, req.body, req.user!.userId);
    res.json(result);
  }
);

/**
 * POST /votes/:id/cast
 * 投票
 */
router.post(
  '/:id/cast',
  authenticate,
  validateBody(CastVoteSchema),
  async (req: Request, res: Response) => {
    await voteService.castVote(req.params.id, req.body, req.user!.userId);
    res.json({ success: true });
  }
);

/**
 * POST /votes/:id/close
 * 关闭投票
 */
router.post('/:id/close', authenticate, async (req: Request, res: Response) => {
  const result = await voteService.closeVote(
    req.params.id,
    req.user!.userId,
    req.user!.isAdmin
  );
  res.json(result);
});

/**
 * POST /votes/:id/cancel
 * 取消投票
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  await voteService.cancelVote(req.params.id, req.user!.userId, req.user!.isAdmin);
  res.json({ success: true });
});

// ================================
// 管理员功能
// ================================

/**
 * DELETE /votes/admin/:id
 * 管理员强制关闭/删除投票
 */
router.delete(
  '/admin/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    await voteService.cancelVote(req.params.id, req.user!.userId, true);
    res.status(204).send();
  }
);

export { router as voteRouter };

