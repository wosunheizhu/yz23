/**
 * 并发控制工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate #12: 并发安全：关键写操作有乐观锁/版本号或唯一约束保护
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { ConflictError, ErrorCodes } from './errors.js';

/**
 * 乐观锁更新
 * 通过 updatedAt 字段实现乐观锁
 * 
 * @param prisma Prisma 客户端
 * @param model 模型名称
 * @param id 记录 ID
 * @param expectedUpdatedAt 期望的更新时间（用于版本校验）
 * @param data 更新数据
 * @returns 更新后的记录
 */
export const optimisticUpdate = async <T>(
  prisma: PrismaClient,
  model: string,
  id: string,
  expectedUpdatedAt: Date,
  data: Record<string, unknown>
): Promise<T> => {
  // 使用 Prisma 的条件更新实现乐观锁
  const tableName = model.toLowerCase() + 's';
  
  try {
    // 先检查记录是否存在且版本匹配
    const result = await prisma.$queryRaw<T[]>`
      UPDATE ${Prisma.raw(tableName)}
      SET ${Prisma.raw(Object.keys(data).map(k => `"${k}" = $${k}`).join(', '))},
          "updatedAt" = NOW()
      WHERE id = ${id}
        AND "updatedAt" = ${expectedUpdatedAt}
      RETURNING *
    `;

    if (!result || (Array.isArray(result) && result.length === 0)) {
      throw new ConflictError(
        ErrorCodes.CONFLICT,
        '数据已被其他用户修改，请刷新后重试'
      );
    }

    return result[0];
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    throw error;
  }
};

/**
 * 使用版本号的乐观锁更新（更简洁的实现）
 * 要求表有 version 字段
 */
export const updateWithVersion = async <T extends { version: number }>(
  findFirst: () => Promise<T | null>,
  update: (currentVersion: number) => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let retries = 0;
  
  while (retries < maxRetries) {
    const current = await findFirst();
    if (!current) {
      throw new ConflictError(ErrorCodes.NOT_FOUND, '记录不存在');
    }
    
    try {
      const updated = await update(current.version);
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Prisma: Record to update not found (version mismatch)
        retries++;
        if (retries >= maxRetries) {
          throw new ConflictError(
            ErrorCodes.CONFLICT,
            `数据更新冲突，已重试 ${maxRetries} 次`
          );
        }
        continue;
      }
      throw error;
    }
  }
  
  throw new ConflictError(ErrorCodes.CONFLICT, '数据更新冲突');
};

/**
 * 检查并发修改
 * 用于更新前检查数据是否已被修改
 */
export const checkConcurrentModification = (
  expectedUpdatedAt: Date | string,
  actualUpdatedAt: Date | string
): void => {
  const expected = new Date(expectedUpdatedAt).getTime();
  const actual = new Date(actualUpdatedAt).getTime();
  
  if (expected !== actual) {
    throw new ConflictError(
      ErrorCodes.CONFLICT,
      '数据已被其他用户修改，请刷新后重试'
    );
  }
};

/**
 * 分布式锁（基于数据库的简单实现）
 * 适用于低并发场景
 */
export const withLock = async <T>(
  prisma: PrismaClient,
  lockKey: string,
  fn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> => {
  const lockId = `lock:${lockKey}`;
  const expiresAt = new Date(Date.now() + timeoutMs);
  
  // 尝试获取锁
  try {
    await prisma.$executeRaw`
      INSERT INTO "distributed_locks" (id, "expiresAt")
      VALUES (${lockId}, ${expiresAt})
      ON CONFLICT (id) DO UPDATE
      SET "expiresAt" = EXCLUDED."expiresAt"
      WHERE "distributed_locks"."expiresAt" < NOW()
    `;
  } catch {
    throw new ConflictError(ErrorCodes.CONFLICT, '操作正在进行中，请稍后重试');
  }
  
  try {
    return await fn();
  } finally {
    // 释放锁
    await prisma.$executeRaw`
      DELETE FROM "distributed_locks" WHERE id = ${lockId}
    `;
  }
};






