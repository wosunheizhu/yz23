/**
 * 事务工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #7: 涉及多表一致性更新（尤其 Token）必须在 DB 事务内
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db.js';
import { logger } from './logger.js';

/**
 * 事务客户端类型
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 事务操作函数类型
 */
export type TransactionFn<T> = (tx: TransactionClient) => Promise<T>;

/**
 * 事务选项
 */
export interface TransactionOptions {
  maxWait?: number;      // 等待获取连接的最大时间(ms)
  timeout?: number;      // 事务执行超时时间(ms)
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * 默认事务选项
 */
const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
  maxWait: 5000,
  timeout: 10000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
};

/**
 * 执行事务
 * 自动处理错误和日志
 */
export const withTransaction = async <T>(
  fn: TransactionFn<T>,
  options: TransactionOptions = {}
): Promise<T> => {
  const opts = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };
  
  logger.debug({ options: opts }, '开始事务');
  
  try {
    const result = await prisma.$transaction(fn, opts);
    logger.debug('事务提交成功');
    return result;
  } catch (error) {
    logger.error({ error }, '事务回滚');
    throw error;
  }
};

/**
 * 批量事务操作
 * 用于执行多个独立的 Prisma 操作
 */
export const batchTransaction = async <T extends Prisma.PrismaPromise<unknown>[]>(
  operations: T
): Promise<Prisma.UnwrapTuple<T>> => {
  logger.debug({ count: operations.length }, '开始批量事务');
  
  try {
    const result = await prisma.$transaction(operations);
    logger.debug('批量事务完成');
    return result;
  } catch (error) {
    logger.error({ error }, '批量事务失败');
    throw error;
  }
};

/**
 * Token 交易专用事务
 * 确保余额检查和扣款在同一事务内
 */
export const tokenTransaction = async <T>(
  fn: TransactionFn<T>
): Promise<T> => {
  return withTransaction(fn, {
    // Token 交易使用 Serializable 隔离级别，防止并发问题
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 15000,
  });
};

/**
 * 重试事务
 * 用于处理瞬时错误（如死锁）
 */
export const retryTransaction = async <T>(
  fn: TransactionFn<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(fn);
    } catch (error) {
      lastError = error as Error;
      
      // 检查是否为可重试错误
      if (isRetryableError(error) && attempt < maxRetries) {
        logger.warn({ attempt, maxRetries, error }, '事务重试');
        await sleep(delay * attempt); // 指数退避
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

/**
 * 检查是否为可重试错误
 */
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034: 写冲突或死锁
    // P1017: 服务器连接断开
    return ['P2034', 'P1017'].includes(error.code);
  }
  return false;
};

/**
 * 休眠函数
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};






