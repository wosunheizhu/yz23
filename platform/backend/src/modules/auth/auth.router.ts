/**
 * 认证路由
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.2: 登录与找回密码
 */

import { Router } from 'express';
import { validateBody } from '../../utils/validation.js';
import { successResponse } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import {
  loginByPasswordSchema,
  loginByCodeSchema,
  sendCodeSchema,
  resetPasswordSchema,
  setInitialPasswordSchema,
  changePasswordSchema,
  selfRegisterSchema,
} from './auth.dto.js';
import * as authService from './auth.service.js';

const router: Router = Router();

/**
 * POST /auth/login/password
 * 账号密码登录
 */
router.post('/login/password', async (req, res, next) => {
  try {
    const dto = validateBody(req.body, loginByPasswordSchema);
    const result = await authService.loginByPassword(dto, req);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/code
 * 验证码登录
 * 注意：此功能暂时禁用
 */
router.post('/login/code', async (_req, res, next) => {
  try {
    // 验证码登录功能暂时禁用
    res.status(503).json({
      success: false,
      error: { code: 'FEATURE_DISABLED', message: '验证码登录功能暂时禁用，请使用密码登录' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/send-code
 * 发送验证码
 * 注意：此功能暂时禁用
 */
router.post('/send-code', async (_req, res, next) => {
  try {
    // 验证码功能暂时禁用
    res.status(503).json({
      success: false,
      error: { code: 'FEATURE_DISABLED', message: '验证码功能暂时禁用，请使用密码登录' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/reset-password
 * 重置密码
 * 注意：此功能暂时禁用
 */
router.post('/reset-password', async (_req, res, next) => {
  try {
    // 重置密码功能暂时禁用
    res.status(503).json({
      success: false,
      error: { code: 'FEATURE_DISABLED', message: '重置密码功能暂时禁用，请联系管理员' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register
 * 自助注册 (PRD 6.1.2 A3)
 * 需要系统配置 ALLOW_SELF_REGISTRATION 开启
 */
router.post('/register', async (req, res, next) => {
  try {
    const dto = validateBody(req.body, selfRegisterSchema);
    const result = await authService.selfRegister(dto, req);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/registration-status
 * 检查是否开放自助注册
 */
router.get('/registration-status', async (req, res, next) => {
  try {
    const enabled = await authService.checkSelfRegistrationEnabled();
    res.json(successResponse({ selfRegistrationEnabled: enabled }, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/set-password
 * 首次设置密码（需登录）
 */
router.post('/set-password', authenticate, async (req, res, next) => {
  try {
    const dto = validateBody(req.body, setInitialPasswordSchema);
    const result = await authService.setInitialPassword(req.user!.userId, dto, req);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/change-password
 * 修改密码（需登录）
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const dto = validateBody(req.body, changePasswordSchema);
    const result = await authService.changePassword(req.user!.userId, dto, req);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * 获取当前用户信息（需登录）
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(req.user!.userId);
    res.json(successResponse(result, req));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * 登出（需登录）
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user!.userId, req);
    res.json(successResponse({ message: '登出成功' }, req));
  } catch (error) {
    next(error);
  }
});

export default router;

