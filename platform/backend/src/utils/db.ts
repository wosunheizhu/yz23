/**
 * 数据库连接
 * 使用 Prisma Client
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// 创建 Prisma 客户端实例
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// 查询日志（开发环境）
prisma.$on('query', (e) => {
  logger.debug({
    type: 'db_query',
    query: e.query,
    params: e.params,
    duration: e.duration,
  }, `DB Query: ${e.duration}ms`);
});

// 错误日志
prisma.$on('error', (e) => {
  logger.error({
    type: 'db_error',
    message: e.message,
  }, `DB Error: ${e.message}`);
});

// 警告日志
prisma.$on('warn', (e) => {
  logger.warn({
    type: 'db_warn',
    message: e.message,
  }, `DB Warn: ${e.message}`);
});

/**
 * 连接数据库
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error({ error }, '数据库连接失败');
    throw error;
  }
};

/**
 * 断开数据库连接
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('数据库连接已关闭');
};

/**
 * 健康检查
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};






