/**
 * 日志工具
 * 使用 Pino 实现结构化日志
 */

import pino from 'pino';
import { config } from '../config/index.js';

// 创建基础日志实例
export const logger = pino({
  level: config.log.level,
  transport: config.env === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 创建带 traceId 的子日志
export const createRequestLogger = (traceId: string): pino.Logger => {
  return logger.child({ traceId });
};

export type Logger = pino.Logger;






