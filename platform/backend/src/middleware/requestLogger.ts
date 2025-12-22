/**
 * 请求日志中间件
 * 记录每个 HTTP 请求的详细信息
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 请求日志中间件
 * - 记录请求开始时间
 * - 在响应结束时记录完整请求信息
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // 记录请求开始
  req.log.info({
    type: 'request_start',
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  }, `→ ${req.method} ${req.originalUrl}`);
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    req.log[logLevel]({
      type: 'request_end',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length'),
    }, `← ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
};






