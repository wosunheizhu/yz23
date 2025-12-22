/**
 * 用户路由
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8: 账号/身份/合伙人档案
 */

import { Router } from 'express';
import { validateBody, validateQuery } from '../../utils/validation.js';
import { successResponse, paginatedResponse } from '../../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { getRoleLevelValue } from '../../utils/visibility.js';
import {
  createUserSchema,
  updateUserProfileSchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  userNoteSchema,
} from './user.dto.js';
import * as userService from './user.service.js';
import * as noteService from './note.service.js';

const router: Router = Router();

/**
 * GET /users
 * 获取用户列表（合伙人名录）(PRD 8.5)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const query = validateQuery(req.query, listUsersQuerySchema);
    const result = await userService.listUsers(
      query,
      req.user!.userId,
      getRoleLevelValue(req.user!.roleLevel),
      req.user!.isAdmin
    );
    res.json(paginatedResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/stats
 * 获取用户统计（管理员）
 */
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await userService.getUserStats();
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/expertise-areas
 * 获取所有擅长领域
 */
router.get('/expertise-areas', authenticate, async (req, res, next) => {
  try {
    const result = await userService.getExpertiseAreas();
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/tags
 * 获取所有标签
 */
router.get('/tags', authenticate, async (req, res, next) => {
  try {
    const result = await userService.getTags();
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /users/me/avatar
 * 上传/更新头像（Base64格式）
 */
router.post('/me/avatar', authenticate, async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 1001, message: '请提供头像数据' },
      });
    }

    // 验证 base64 格式
    if (!avatar.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: { code: 1001, message: '无效的图片格式' },
      });
    }

    // 保存头像（直接存储 base64）
    const result = await userService.updateUserAvatar(req.user!.userId, avatar);
    res.json(successResponse({ avatarUrl: result.avatar }, req));
  } catch (error) {
    next(error);
  }
});

// ================================
// 本地标签/备注 (PRD 8.5 / 6.1.5)
// ================================

/**
 * GET /users/notes
 * 获取我的所有本地标签/备注
 */
router.get('/notes', authenticate, async (req, res, next) => {
  try {
    const result = await noteService.listLocalNotes(req.user!.userId);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/notes/tags
 * 获取我的所有本地标签（用于筛选）
 */
router.get('/notes/tags', authenticate, async (req, res, next) => {
  try {
    const result = await noteService.getMyLocalTags(req.user!.userId);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id
 * 获取用户详情
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await userService.getUserById(
      req.params.id,
      req.user!.userId,
      req.user!.isAdmin
    );
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id/note
 * 获取我对某人的本地标签/备注
 */
router.get('/:id/note', authenticate, async (req, res, next) => {
  try {
    const result = await noteService.getLocalNote(req.user!.userId, req.params.id);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /users/:id/note
 * 创建或更新我对某人的本地标签/备注
 */
router.put('/:id/note', authenticate, async (req, res, next) => {
  try {
    const dto = validateBody(
      { ...req.body, targetUserId: req.params.id },
      userNoteSchema
    );
    const result = await noteService.upsertLocalNote(req.user!.userId, dto);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /users/:id/note
 * 删除我对某人的本地标签/备注
 */
router.delete('/:id/note', authenticate, async (req, res, next) => {
  try {
    await noteService.deleteLocalNote(req.user!.userId, req.params.id);
    res.json(successResponse({ message: '删除成功' }, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /users
 * 创建用户（管理员）(PRD 8.3)
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const dto = validateBody(req.body, createUserSchema);
    const result = await userService.createUser(dto, req.user!.userId);
    res.status(201).json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /users/:id
 * 更新用户资料（自己或管理员）(PRD 8.4)
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const isSelf = userId === req.user!.userId;
    
    if (isSelf) {
      // 更新自己的资料
      const dto = validateBody(req.body, updateUserProfileSchema);
      const result = await userService.updateUserProfile(userId, dto, req.user!.userId);
      res.json(successResponse(result, req));
    } else if (req.user!.isAdmin) {
      // 管理员更新他人
      const dto = validateBody(req.body, adminUpdateUserSchema);
      const result = await userService.adminUpdateUser(userId, dto, req.user!.userId);
      res.json(successResponse(result, req));
    } else {
      res.status(403).json({
        success: false,
        error: {
          code: 4030,
          message: '只能编辑自己的资料',
        },
        traceId: req.traceId,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /users/:id
 * 删除用户（管理员软删除）
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user!.userId);
    res.json(successResponse({ message: '用户已删除' }, req));
  } catch (error) {
    next(error);
  }
});

export default router;

