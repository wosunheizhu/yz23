/**
 * Trace ID 中间件
 * 为每个请求生成唯一追踪ID，用于日志关联和问题排查
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger, Logger } from '../utils/logger.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      traceId: string;
      log: Logger;
    }
  }
}

export const TRACE_ID_HEADER = 'X-Trace-Id';

/**
 * Trace ID 中间件
 * - 从请求头获取或生成新的 trace_id
 * - 在响应头中返回 trace_id
 * - 创建带 trace_id 的日志实例挂载到 req 上
 */
export const traceIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 从请求头获取或生成新的 trace_id
  const traceId = (req.headers[TRACE_ID_HEADER.toLowerCase()] as string) || uuidv4();
  
  // 挂载到请求对象
  req.traceId = traceId;
  
  // 创建带 trace_id 的日志实例
  req.log = createRequestLogger(traceId);
  
  // 在响应头中返回 trace_id
  res.setHeader(TRACE_ID_HEADER, traceId);
  
  next();
};






