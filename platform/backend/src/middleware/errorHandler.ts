/**
 * 全局错误处理中间件
 * 统一处理所有错误并返回规范化的响应
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes, InternalError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { TRACE_ID_HEADER } from './traceId.js';

/**
 * 404 处理中间件
 * 处理未匹配到任何路由的请求
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    { code: 1002, message: `路径 ${req.method} ${req.originalUrl} 不存在` },
    404
  );
  next(error);
};

/**
 * 全局错误处理中间件
 * - 记录错误日志
 * - 返回统一格式的错误响应
 * - 包含 trace_id 方便问题追踪
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 确定是否为已知业务错误
  const isAppError = err instanceof AppError;
  
  // 转换为统一错误格式
  const appError = isAppError 
    ? err 
    : new InternalError(err.message);
  
  // 记录错误日志
  const logData = {
    type: 'error',
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    stack: config.env === 'development' ? err.stack : undefined,
    details: appError.details,
  };
  
  if (appError.isOperational) {
    req.log.warn(logData, `业务错误: ${appError.message}`);
  } else {
    req.log.error(logData, `系统错误: ${appError.message}`);
  }
  
  // 构造响应
  const response = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && { details: appError.details }),
      ...(config.env === 'development' && !isAppError && { stack: err.stack }),
    },
    traceId: req.traceId,
  };
  
  res.status(appError.statusCode).json(response);
};

/**
 * 统一成功响应格式
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  traceId: string;
}

/**
 * 创建成功响应
 * 支持两种调用方式：
 * - successResponse(data, req) - 返回响应对象
 * - successResponse(res, data, statusCode) - 直接发送响应
 */
export const successResponse = <T>(
  arg1: T | Response,
  arg2?: T | Request,
  arg3?: number
): T extends Response ? Response : { success: true; data: T; traceId?: string } => {
  // 判断调用格式
  if (arg1 && typeof (arg1 as Response).status === 'function' && typeof (arg1 as Response).json === 'function') {
    // (res, data, statusCode) 格式
    const res = arg1 as unknown as Response;
    const data = arg2 as T;
    const statusCode = arg3 || 200;
    const traceId = res.getHeader(TRACE_ID_HEADER) as string;
    return res.status(statusCode).json({
      success: true,
      data,
      traceId,
    }) as any;
  } else {
    // (data, req) 格式 - 返回响应对象用于 res.json()
    const data = arg1;
    const req = arg2 as Request;
    const traceId = req?.traceId || '';
    return {
      success: true,
      data,
      traceId,
    } as any;
  }
};

/**
 * 创建分页响应
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  traceId: string;
}

/**
 * 分页响应函数
 * 支持两种调用方式：
 * 1. paginatedResponse(paginatedResult, req) - 返回对象用于 res.json()
 * 2. paginatedResponse(res, data, page, pageSize, total) - 直接发送响应
 */
export const paginatedResponse = <T>(
  arg1: Response | { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages?: number } },
  arg2?: Request | T[],
  arg3?: number,
  arg4?: number,
  arg5?: number
): Response | PaginatedResponse<T> => {
  // 检查是否为 (paginatedResult, req) 格式
  if (arg1 && typeof arg1 === 'object' && 'data' in arg1 && 'pagination' in arg1) {
    const result = arg1 as { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages?: number } };
    const req = arg2 as Request;
    const traceId = req?.traceId || '';
    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages ?? Math.ceil(result.pagination.total / result.pagination.pageSize),
      },
      traceId,
    };
  }
  
  // (res, data, page, pageSize, total) 格式
  const res = arg1 as Response;
  const data = arg2 as T[];
  const page = arg3 as number;
  const pageSize = arg4 as number;
  const total = arg5 as number;
  
  const traceId = res.getHeader(TRACE_ID_HEADER) as string;
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    traceId,
  });
};

