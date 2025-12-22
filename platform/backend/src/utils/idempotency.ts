/**
 * 幂等性工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #6: 所有"状态改变型"接口支持幂等
 */

import { prisma } from './db.js';
import { logger } from './logger.js';
import { ConflictError, ErrorCodes } from './errors.js';

/**
 * 幂等性键前缀
 */
const IDEMPOTENCY_PREFIX = 'idempotency:';

/**
 * 幂等记录模型（需要在 Prisma schema 中添加）
 * 或者使用 Redis 存储
 */

/**
 * 生成幂等性键
 * @param type 操作类型
 * @param identifiers 唯一标识符数组
 */
export const generateIdempotencyKey = (
  type: string,
  ...identifiers: (string | number)[]
): string => {
  return `${IDEMPOTENCY_PREFIX}${type}:${identifiers.join(':')}`;
};

/**
 * 状态转换验证器
 * 确保状态只能按预定义路径转换
 */
export type StateTransitions<S extends string> = {
  [K in S]?: S[];
};

/**
 * 验证状态转换是否合法
 */
export const validateStateTransition = <S extends string>(
  currentState: S,
  targetState: S,
  transitions: StateTransitions<S>,
  entityType: string = 'entity'
): void => {
  const allowedNextStates = transitions[currentState] ?? [];
  
  if (!allowedNextStates.includes(targetState)) {
    logger.warn({
      currentState,
      targetState,
      allowedNextStates,
      entityType,
    }, '非法状态转换');
    
    throw new ConflictError(
      { 
        code: 1005, 
        message: `${entityType}状态无法从 ${currentState} 转换到 ${targetState}` 
      },
      { currentState, targetState, allowedNextStates }
    );
  }
};

/**
 * Token 交易状态转换规则
 */
export const TOKEN_TRANSACTION_TRANSITIONS: StateTransitions<string> = {
  PENDING_ADMIN_APPROVAL: ['PENDING_RECEIVER_CONFIRM', 'REJECTED', 'CANCELLED'],
  PENDING_RECEIVER_CONFIRM: ['COMPLETED', 'REJECTED', 'CANCELLED'],
  COMPLETED: [], // 终态
  REJECTED: [],  // 终态
  CANCELLED: [], // 终态
};

/**
 * 项目审核状态转换规则
 */
export const PROJECT_REVIEW_TRANSITIONS: StateTransitions<string> = {
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['PENDING_REVIEW'], // 可重新提交
};

/**
 * 项目业务状态转换规则
 */
export const PROJECT_BUSINESS_TRANSITIONS: StateTransitions<string> = {
  ONGOING: ['PAUSED', 'COMPLETED', 'ABANDONED'],
  PAUSED: ['ONGOING', 'ABANDONED'],
  COMPLETED: [],  // 终态
  ABANDONED: [], // 终态
};

/**
 * 需求状态转换规则
 */
export const DEMAND_STATUS_TRANSITIONS: StateTransitions<string> = {
  OPEN: ['CLOSED'],
  CLOSED: ['OPEN'], // 可重新开放
};

/**
 * 响应状态转换规则
 */
export const RESPONSE_STATUS_TRANSITIONS: StateTransitions<string> = {
  SUBMITTED: ['ACCEPTED_PENDING_USAGE', 'REJECTED'],
  ACCEPTED_PENDING_USAGE: ['USED', 'MODIFIED', 'ABANDONED'],
  USED: [],      // 终态
  REJECTED: [],  // 终态
  ABANDONED: [], // 终态
  MODIFIED: ['USED', 'ABANDONED'],
};

/**
 * Token 发放任务状态转换规则
 */
export const TOKEN_GRANT_TASK_TRANSITIONS: StateTransitions<string> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: [],  // 终态
  REJECTED: [],  // 终态
};

/**
 * 场地预约状态转换规则
 */
export const BOOKING_STATUS_TRANSITIONS: StateTransitions<string> = {
  CONFIRMED: ['CANCELLED', 'FINISHED'],
  CANCELLED: [], // 终态
  FINISHED: [],  // 终态
};

/**
 * 会议状态转换规则
 */
export const MEETING_STATUS_TRANSITIONS: StateTransitions<string> = {
  SCHEDULED: ['FINISHED', 'CANCELLED'],
  FINISHED: [],  // 终态
  CANCELLED: [], // 终态
};

/**
 * 幂等操作包装器
 * 如果操作已完成，返回之前的结果而不是报错
 */
export const idempotentOperation = async <T>(
  key: string,
  getCurrentState: () => Promise<T | null>,
  expectedState: (current: T) => boolean,
  execute: () => Promise<T>
): Promise<{ result: T; wasIdempotent: boolean }> => {
  // 检查当前状态
  const current = await getCurrentState();
  
  if (current && expectedState(current)) {
    logger.info({ key }, '幂等操作：已完成，返回现有结果');
    return { result: current, wasIdempotent: true };
  }
  
  // 执行操作
  const result = await execute();
  return { result, wasIdempotent: false };
};






