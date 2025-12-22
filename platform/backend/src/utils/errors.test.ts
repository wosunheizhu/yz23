/**
 * 错误类单元测试
 * 元征 · 合伙人赋能平台
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
  ErrorCodes,
} from './errors.js';

describe('错误类', () => {
  describe('AppError', () => {
    it('应该正确创建基础错误', () => {
      const error = new AppError(ErrorCodes.INTERNAL_ERROR, 500);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(1000);
      expect(error.message).toBe('服务器内部错误');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('应该包含堆栈信息', () => {
      const error = new AppError(ErrorCodes.INTERNAL_ERROR, 500);
      expect(error.stack).toBeDefined();
    });

    it('应该正确转换为JSON', () => {
      const error = new AppError(ErrorCodes.VALIDATION_ERROR, 400, { field: 'email' });
      const json = error.toJSON();
      
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect((json.error as any).code).toBe(1001);
      expect((json.error as any).details).toEqual({ field: 'email' });
    });
  });

  describe('BadRequestError', () => {
    it('应该使用正确的状态码和错误码', () => {
      const error = new BadRequestError(ErrorCodes.VALIDATION_ERROR);
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(1001);
      expect(error.message).toBe('请求参数验证失败');
    });

    it('应该支持附加详情', () => {
      const details = { field: 'email', reason: '格式不正确' };
      const error = new BadRequestError(ErrorCodes.VALIDATION_ERROR, details);
      
      expect(error.details).toEqual(details);
    });
  });

  describe('UnauthorizedError', () => {
    it('应该使用 401 状态码', () => {
      const error = new UnauthorizedError(ErrorCodes.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(1003);
    });

    it('应该处理Token过期', () => {
      const error = new UnauthorizedError(ErrorCodes.AUTH_TOKEN_EXPIRED);
      expect(error.code).toBe(2002);
      expect(error.message).toBe('登录已过期，请重新登录');
    });
  });

  describe('ForbiddenError', () => {
    it('应该使用 403 状态码', () => {
      const error = new ForbiddenError(ErrorCodes.FORBIDDEN);
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(1004);
    });
  });

  describe('NotFoundError', () => {
    it('应该使用 404 状态码', () => {
      const error = new NotFoundError(ErrorCodes.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(1002);
    });

    it('应该处理特定资源不存在', () => {
      const error = new NotFoundError(ErrorCodes.USER_NOT_FOUND);
      expect(error.code).toBe(3001);
      expect(error.message).toBe('用户不存在');
    });
  });

  describe('ConflictError', () => {
    it('应该使用 409 状态码', () => {
      const error = new ConflictError(ErrorCodes.CONFLICT);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(1005);
    });

    it('应该处理场地预约冲突', () => {
      const error = new ConflictError(ErrorCodes.VENUE_BOOKING_CONFLICT);
      expect(error.code).toBe(9003);
      expect(error.message).toBe('场地预约时间冲突');
    });
  });

  describe('InternalError', () => {
    it('应该使用 500 状态码', () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(1000);
      expect(error.isOperational).toBe(false);
    });

    it('应该保留原始错误信息', () => {
      const error = new InternalError('数据库连接失败');
      expect(error.details).toEqual({ originalMessage: '数据库连接失败' });
    });
  });
});

describe('错误码常量', () => {
  it('应该定义通用错误码', () => {
    expect(ErrorCodes.INTERNAL_ERROR.code).toBe(1000);
    expect(ErrorCodes.VALIDATION_ERROR.code).toBe(1001);
    expect(ErrorCodes.NOT_FOUND.code).toBe(1002);
    expect(ErrorCodes.UNAUTHORIZED.code).toBe(1003);
    expect(ErrorCodes.FORBIDDEN.code).toBe(1004);
  });

  it('应该定义认证相关错误码', () => {
    expect(ErrorCodes.AUTH_INVALID_CREDENTIALS.code).toBe(2001);
    expect(ErrorCodes.AUTH_TOKEN_EXPIRED.code).toBe(2002);
    expect(ErrorCodes.AUTH_TOKEN_INVALID.code).toBe(2003);
  });

  it('应该定义用户相关错误码', () => {
    expect(ErrorCodes.USER_NOT_FOUND.code).toBe(3001);
    expect(ErrorCodes.USER_ALREADY_EXISTS.code).toBe(3002);
  });

  it('应该定义项目相关错误码', () => {
    expect(ErrorCodes.PROJECT_NOT_FOUND.code).toBe(4001);
    expect(ErrorCodes.PROJECT_CREATE_PERMISSION.code).toBe(4002);
  });

  it('应该定义Token相关错误码', () => {
    expect(ErrorCodes.TOKEN_INSUFFICIENT.code).toBe(7001);
    expect(ErrorCodes.TOKEN_TRANSACTION_NOT_FOUND.code).toBe(7002);
  });

  it('应该定义会议/日历相关错误码', () => {
    expect(ErrorCodes.MEETING_NOT_FOUND.code).toBe(9001);
    expect(ErrorCodes.VENUE_BOOKING_CONFLICT.code).toBe(9003);
  });

  it('应该定义可见性相关错误码', () => {
    expect(ErrorCodes.VISIBILITY_VIOLATION.code).toBe(10001);
  });
});
