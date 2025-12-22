/**
 * 社群动态路由 - Node 10
 * PRD 17/6.9: 社群模块
 */

import { Router, type Request, type Response } from 'express';
import { authenticate, adminOnly } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { getRoleLevelValue } from '../../utils/visibility.js';
import {
  CreatePostSchema,
  UpdatePostSchema,
  ListPostsQuerySchema,
  CreateCommentSchema,
} from './post.dto.js';
import * as postService from './post.service.js';

const router: Router = Router();

// ================================
// 动态相关
// ================================

/**
 * GET /posts
 * 获取动态列表
 */
router.get(
  '/',
  authenticate,
  validateQuery(ListPostsQuerySchema),
  async (req: Request, res: Response) => {
    const roleLevel = getRoleLevelValue(req.user!.roleLevel);
    const result = await postService.listPosts(req.query as never, req.user!.userId, roleLevel);
    res.json(result);
  }
);

/**
 * GET /posts/:id
 * 获取动态详情
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await postService.getPostById(req.params.id, req.user!.userId);
  if (!result) {
    res.status(404).json({ error: '动态不存在' });
    return;
  }
  res.json(result);
});

/**
 * POST /posts
 * 发布动态
 */
router.post(
  '/',
  authenticate,
  validateBody(CreatePostSchema),
  async (req: Request, res: Response) => {
    const result = await postService.createPost(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * PATCH /posts/:id
 * 更新动态
 */
router.patch(
  '/:id',
  authenticate,
  validateBody(UpdatePostSchema),
  async (req: Request, res: Response) => {
    const result = await postService.updatePost(req.params.id, req.body, req.user!.userId);
    res.json(result);
  }
);

/**
 * DELETE /posts/:id
 * 删除动态
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  await postService.deletePost(req.params.id, req.user!.userId, req.user!.isAdmin);
  res.status(204).send();
});

// ================================
// 点赞
// ================================

/**
 * POST /posts/:id/like
 * 点赞动态
 */
router.post('/:id/like', authenticate, async (req: Request, res: Response) => {
  await postService.likePost(req.params.id, req.user!.userId);
  res.json({ success: true });
});

/**
 * DELETE /posts/:id/like
 * 取消点赞
 */
router.delete('/:id/like', authenticate, async (req: Request, res: Response) => {
  await postService.unlikePost(req.params.id, req.user!.userId);
  res.status(204).send();
});

// ================================
// 评论
// ================================

/**
 * GET /posts/:id/comments
 * 获取动态评论列表
 */
router.get('/:id/comments', authenticate, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const result = await postService.listComments(req.params.id, page, pageSize);
  res.json(result);
});

/**
 * POST /posts/:id/comments
 * 发表评论
 */
router.post(
  '/:id/comments',
  authenticate,
  validateBody(CreateCommentSchema),
  async (req: Request, res: Response) => {
    const result = await postService.createComment(req.params.id, req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * DELETE /posts/:postId/comments/:commentId
 * 删除评论
 */
router.delete(
  '/:postId/comments/:commentId',
  authenticate,
  async (req: Request, res: Response) => {
    await postService.deleteComment(req.params.commentId, req.user!.userId, req.user!.isAdmin);
    res.status(204).send();
  }
);

// ================================
// 管理员功能
// ================================

/**
 * DELETE /posts/admin/:id
 * 管理员删除动态
 */
router.delete(
  '/admin/:id',
  authenticate,
  adminOnly,
  async (req: Request, res: Response) => {
    await postService.deletePost(req.params.id, req.user!.userId, true);
    res.status(204).send();
  }
);

export { router as postRouter };

