/**
 * 类型定义
 * 元征 · 合伙人赋能平台
 */

import { Request } from 'express';
import { DecodedToken } from '../utils/jwt.js';
import { Logger } from '../utils/logger.js';

// 扩展 Express Request
export interface AuthenticatedRequest extends Request {
  user: DecodedToken;
  traceId: string;
  log: Logger;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 排序参数
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// 通用列表查询参数
export interface ListQueryParams extends Partial<PaginationParams> {
  search?: string;
  sort?: SortParams;
}

// 可见性参数
export interface VisibilityParams {
  visibilityScopeType: 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
}

// Token 初始额度配置
export const TOKEN_INITIAL_AMOUNTS = {
  FOUNDER: 100000,
  CORE_PARTNER: 30000,
  PARTNER: 10000,
} as const;

// 嘉宾邀请奖励默认值
export const GUEST_REWARD_DEFAULTS = {
  PUBLIC_CO_DMHG: 500,
  FIN_EXEC: 500,
  PUBLIC_CHAIRMAN_CONTROLLER: 1000,
  MINISTRY_LEADER: 2000,
  OTHER: 0,
} as const;

// 项目事件类型枚举
export const PROJECT_EVENT_TYPES = {
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_APPROVED: 'PROJECT_APPROVED',
  PROJECT_REJECTED: 'PROJECT_REJECTED',
  PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',
  PROJECT_MEMBER_JOINED: 'PROJECT_MEMBER_JOINED',
  PROJECT_MEMBER_LEFT: 'PROJECT_MEMBER_LEFT',
  SHARE_STRUCTURE_CHANGED: 'SHARE_STRUCTURE_CHANGED',
  DEMAND_PUBLISHED: 'DEMAND_PUBLISHED',
  DEMAND_UPDATED: 'DEMAND_UPDATED',
  DEMAND_CLOSED: 'DEMAND_CLOSED',
  DEMAND_CANCELLED: 'DEMAND_CANCELLED',
  DEMAND_RESPONDED: 'DEMAND_RESPONDED',
  DEMAND_RESPONSE_REJECTED: 'DEMAND_RESPONSE_REJECTED',
  DEMAND_ACCEPTED: 'DEMAND_ACCEPTED',
  DEMAND_RESPONSE_ABANDONED: 'DEMAND_RESPONSE_ABANDONED',
  DEMAND_RESPONSE_MODIFIED: 'DEMAND_RESPONSE_MODIFIED',
  RESOURCE_USED: 'RESOURCE_USED',
  TOKEN_TRANSFER_COMPLETED: 'TOKEN_TRANSFER_COMPLETED',
  TOKEN_DIVIDEND_DISTRIBUTED: 'TOKEN_DIVIDEND_DISTRIBUTED',
  MEETING_HELD: 'MEETING_HELD',
  MEETING_MINUTES_ADDED: 'MEETING_MINUTES_ADDED',
  NEWS_LINKED: 'NEWS_LINKED',
  PROJECT_VALUE_RECORDED: 'PROJECT_VALUE_RECORDED',
  PROJECT_CLOSED: 'PROJECT_CLOSED',
  MILESTONE_ADDED: 'MILESTONE_ADDED',
  NOTE: 'NOTE',
  EVENT_CORRECTED: 'EVENT_CORRECTED',
} as const;






