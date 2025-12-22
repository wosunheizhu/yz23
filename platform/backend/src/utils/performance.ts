/**
 * 性能监控工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD 4.5: 接口性能目标 ≤ 300ms（P95）
 * PRD Gate #18: 性能冒烟：核心接口 P95 在目标范围内
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

/**
 * 性能阈值配置（毫秒）
 */
export const PERFORMANCE_THRESHOLDS = {
  /** 普通业务接口目标 */
  NORMAL_API: 300,
  /** AI/外部服务接口目标 */
  EXTERNAL_API: 3000,
  /** 数据库查询警告阈值 */
  DB_QUERY_WARN: 100,
  /** 数据库查询错误阈值 */
  DB_QUERY_ERROR: 500,
};

/**
 * 请求计时器
 */
export interface RequestTimer {
  start: number;
  end?: number;
  duration?: number;
}

/**
 * 创建计时器
 */
export const createTimer = (): RequestTimer => ({
  start: Date.now(),
});

/**
 * 结束计时器
 */
export const endTimer = (timer: RequestTimer): number => {
  timer.end = Date.now();
  timer.duration = timer.end - timer.start;
  return timer.duration;
};

/**
 * 性能指标收集器（简易版）
 * 生产环境建议使用 Prometheus/Grafana
 */
interface PerformanceMetric {
  path: string;
  method: string;
  durations: number[];
  count: number;
  lastUpdated: Date;
}

const metrics = new Map<string, PerformanceMetric>();

/**
 * 记录请求性能指标
 */
export const recordMetric = (
  method: string,
  path: string,
  duration: number
): void => {
  const key = `${method}:${path}`;
  
  let metric = metrics.get(key);
  if (!metric) {
    metric = {
      path,
      method,
      durations: [],
      count: 0,
      lastUpdated: new Date(),
    };
    metrics.set(key, metric);
  }
  
  // 保留最近1000个样本用于计算 P95
  if (metric.durations.length >= 1000) {
    metric.durations.shift();
  }
  
  metric.durations.push(duration);
  metric.count++;
  metric.lastUpdated = new Date();
};

/**
 * 计算 P95
 */
export const calculateP95 = (durations: number[]): number => {
  if (durations.length === 0) return 0;
  
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index];
};

/**
 * 获取所有性能指标
 */
export const getMetrics = (): Record<string, {
  path: string;
  method: string;
  count: number;
  p95: number;
  avg: number;
  max: number;
  lastUpdated: Date;
}> => {
  const result: Record<string, any> = {};
  
  for (const [key, metric] of metrics.entries()) {
    const avg = metric.durations.reduce((a, b) => a + b, 0) / metric.durations.length;
    const max = Math.max(...metric.durations);
    
    result[key] = {
      path: metric.path,
      method: metric.method,
      count: metric.count,
      p95: calculateP95(metric.durations),
      avg: Math.round(avg),
      max,
      lastUpdated: metric.lastUpdated,
    };
  }
  
  return result;
};

/**
 * 性能监控中间件
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timer = createTimer();
  
  // 响应完成时记录
  res.on('finish', () => {
    const duration = endTimer(timer);
    
    // 记录指标
    recordMetric(req.method, req.route?.path || req.path, duration);
    
    // 检查是否超过阈值
    const threshold = req.path.includes('/ai/') || req.path.includes('/external/')
      ? PERFORMANCE_THRESHOLDS.EXTERNAL_API
      : PERFORMANCE_THRESHOLDS.NORMAL_API;
    
    if (duration > threshold) {
      logger.warn({
        type: 'slow_request',
        method: req.method,
        path: req.path,
        duration,
        threshold,
      }, `慢请求: ${req.method} ${req.path} ${duration}ms`);
    }
  });
  
  next();
};

/**
 * 清理过期指标（可由定时任务调用）
 */
export const cleanupMetrics = (maxAgeHours: number = 24): number => {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [key, metric] of metrics.entries()) {
    if (metric.lastUpdated < cutoff) {
      metrics.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
};






