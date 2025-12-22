/**
 * 认证中间件
 * 元征 · 合伙人赋能平台
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError, ErrorCodes } from '../utils/errors.js';
import { verifyTokenOrThrow, extractTokenFromHeader, DecodedToken } from '../utils/jwt.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * 认证中间件
 * 验证 JWT Token 并将用户信息挂载到 req.user
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError(ErrorCodes.UNAUTHORIZED);
    }
    
    const decoded = verifyTokenOrThrow(token);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      // JWT 验证失败
      next(new UnauthorizedError(ErrorCodes.TOKEN_INVALID));
    }
  }
};

/**
 * 可选认证中间件
 * Token 存在时解析，不存在时也允许通过
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyTokenOrThrow(token);
      req.user = decoded;
    }
    
    next();
  } catch {
    // Token 无效时，继续但不设置 user
    next();
  }
};

/**
 * 管理员权限中间件
 * 必须先经过 authenticate 中间件
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isAdmin) {
    next(new ForbiddenError(ErrorCodes.FORBIDDEN));
    return;
  }
  next();
};

/**
 * 角色级别权限中间件
 * 必须先经过 authenticate 中间件
 * @param minLevel 最低要求的角色级别 (1=普通, 2=核心, 3=联合创始人)
 */
export const requireRoleLevel = (minLevel: number) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const roleLevelMap: Record<string, number> = {
      PARTNER: 1,
      CORE_PARTNER: 2,
      FOUNDER: 3,
    };
    
    const userLevel = roleLevelMap[req.user?.roleLevel ?? 'PARTNER'] || 1;
    
    if (userLevel < minLevel && !req.user?.isAdmin) {
      next(new ForbiddenError(ErrorCodes.FORBIDDEN));
      return;
    }
    
    next();
  };
};

/**
 * 联合创始人权限中间件
 */
export const requireFounder = requireRoleLevel(3);

/**
 * 核心合伙人及以上权限中间件
 */
export const requireCorePartner = requireRoleLevel(2);

/**
 * 管理员权限中间件（别名）
 */
export const adminOnly = requireAdmin;

