/**
 * 统一错误处理
 * 元征 · 合伙人赋能平台
 */

// 错误码定义
// 兼容性别名
export const ERROR_CODES = {
  // 通用错误 1xxx
  INTERNAL_ERROR: { code: 1000, message: '服务器内部错误' },
  VALIDATION_ERROR: { code: 1001, message: '请求参数验证失败' },
  NOT_FOUND: { code: 1002, message: '资源不存在' },
  UNAUTHORIZED: { code: 1003, message: '未授权访问' },
  FORBIDDEN: { code: 1004, message: '无权限执行此操作' },
  CONFLICT: { code: 1005, message: '资源冲突' },
  TOO_MANY_REQUESTS: { code: 1006, message: '请求过于频繁' },
  
  // 认证相关 2xxx
  INVALID_CREDENTIALS: { code: 2001, message: '用户名或密码错误' },
  TOKEN_EXPIRED: { code: 2002, message: '登录已过期，请重新登录' },
  TOKEN_INVALID: { code: 2003, message: '无效的认证令牌' },
  INVALID_VERIFICATION_CODE: { code: 2004, message: '验证码错误或已过期' },
  VERIFICATION_CODE_RATE_LIMIT: { code: 2005, message: '验证码发送过于频繁，请稍后再试' },
  PASSWORD_NOT_SET: { code: 2006, message: '账号尚未设置密码' },
  PASSWORD_ALREADY_SET: { code: 2007, message: '密码已设置' },
  
  // 用户相关 3xxx
  USER_NOT_FOUND: { code: 3001, message: '用户不存在' },
  USER_ALREADY_EXISTS: { code: 3002, message: '用户已存在' },
  EMAIL_EXISTS: { code: 3003, message: '邮箱已被注册' },
  PHONE_EXISTS: { code: 3004, message: '手机号已被注册' },
  
  // 项目相关 4xxx
  PROJECT_NOT_FOUND: { code: 4001, message: '项目不存在' },
  PROJECT_CREATE_PERMISSION: { code: 4002, message: '只有联合创始人可以发起项目' },
  PROJECT_PENDING_REVIEW: { code: 4003, message: '项目待审核中，无法执行此操作' },
  PROJECT_JOIN_PENDING: { code: 4004, message: '加入申请待审批中' },
  PROJECT_ALREADY_MEMBER: { code: 4005, message: '已是项目成员' },
  
  // 需求相关 5xxx
  DEMAND_NOT_FOUND: { code: 5001, message: '需求不存在' },
  DEMAND_CLOSED: { code: 5002, message: '需求已关闭' },
  DEMAND_NOT_OWNER: { code: 5003, message: '非需求负责人，无权操作' },
  
  // 响应相关 6xxx
  RESPONSE_NOT_FOUND: { code: 6001, message: '响应不存在' },
  RESPONSE_ALREADY_PROCESSED: { code: 6002, message: '响应已处理' },
  
  // Token相关 7xxx
  TOKEN_INSUFFICIENT: { code: 7001, message: 'Token余额不足' },
  TOKEN_TRANSACTION_NOT_FOUND: { code: 7002, message: '交易记录不存在' },
  TOKEN_TRANSACTION_INVALID_STATE: { code: 7003, message: '交易状态无效' },
  TOKEN_SELF_TRANSFER: { code: 7004, message: '不能向自己转账' },
  
  // 资源相关 8xxx
  RESOURCE_NOT_FOUND: { code: 8001, message: '资源不存在' },
  NETWORK_RESOURCE_NOT_FOUND: { code: 8002, message: '人脉资源不存在' },
  
  // 会议/日历相关 9xxx
  MEETING_NOT_FOUND: { code: 9001, message: '会议不存在' },
  VENUE_NOT_FOUND: { code: 9002, message: '场地不存在' },
  VENUE_BOOKING_CONFLICT: { code: 9003, message: '场地预约时间冲突' },
  VENUE_DISABLED: { code: 9004, message: '场地已停用' },
  BOOKING_NOT_FOUND: { code: 9005, message: '预约记录不存在' },
  MEAL_TIME_INVALID: { code: 9006, message: '用餐时间必须在预约时间范围内' },
  
  // 可见性相关 10xxx
  VISIBILITY_VIOLATION: { code: 10001, message: '不能屏蔽更高级别用户的可见性' },
  
  // 通知相关 11xxx
  NOTIFICATION_SEND_FAILED: { code: 11001, message: '通知发送失败' },
} as const;

// 兼容性别名
export const ErrorCodes = ERROR_CODES;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * 应用错误基类
 */
export class AppError extends Error {
  public readonly code: number;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    errorCode: ErrorCode,
    statusCode: number = 400,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(errorCode.message);
    this.code = errorCode.code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.VALIDATION_ERROR, customMessageOrDetails?: string | Record<string, unknown>) {
    // 支持两种用法：
    // 1. BadRequestError(errorCode, '自定义消息') - 使用自定义消息
    // 2. BadRequestError(errorCode, { details }) - 使用 details 对象
    const details = typeof customMessageOrDetails === 'object' ? customMessageOrDetails : undefined;
    
    // 如果是自定义消息，创建临时错误码对象
    if (typeof customMessageOrDetails === 'string') {
      const customErrorCode = { code: errorCode.code, message: customMessageOrDetails } as ErrorCode;
      super(customErrorCode, 400, undefined);
    } else {
      super(errorCode, 400, details);
    }
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.UNAUTHORIZED, customMessage?: string) {
    super(errorCode, 401);
    if (customMessage) {
      this.message = customMessage;
    }
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.FORBIDDEN, customMessage?: string) {
    super(errorCode, 403);
    if (customMessage) {
      this.message = customMessage;
    }
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.NOT_FOUND, customMessage?: string) {
    super(errorCode, 404);
    if (customMessage) {
      this.message = customMessage;
    }
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.CONFLICT, details?: string | Record<string, unknown>) {
    const detailsObj = typeof details === 'string' ? { message: details } : details;
    super(errorCode, 409, detailsObj);
  }
}

/**
 * 429 Too Many Requests
 */
export class TooManyRequestsError extends AppError {
  constructor(errorCode: ErrorCode = ErrorCodes.TOO_MANY_REQUESTS, customMessage?: string) {
    super(errorCode, 429);
    if (customMessage) {
      this.message = customMessage;
    }
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message?: string) {
    super(ERROR_CODES.INTERNAL_ERROR, 500, message ? { originalMessage: message } : undefined, false);
  }
}

/**
 * 业务错误类（兼容性别名）
 * 用于一般业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(code: number, message: string, details?: Record<string, unknown>) {
    // 创建一个临时的错误码对象
    const errorCode = { code, message } as ErrorCode;
    super(errorCode, 400, details);
  }
}

