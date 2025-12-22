/**
 * 审计日志工具
 * 元征 · 合伙人赋能平台
 * 
 * 记录敏感操作的审计日志，用于运维和合规查询
 */

import { prisma } from './db.js';
import { logger } from './logger.js';

// 审计动作类型
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SOFT_DELETE'
  | 'RESTORE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'TOKEN_TRANSFER'
  | 'TOKEN_GRANT'
  | 'TOKEN_DEDUCT'
  | 'ADMIN_OVERRIDE'
  | 'VISIBILITY_CHANGE'
  // 预约相关
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_ADMIN_OVERRIDE'
  | 'BOOKING_FINISHED'
  // 场地相关
  | 'VENUE_CREATED'
  | 'VENUE_UPDATED'
  | 'VENUE_DISABLED'
  | 'VENUE_ENABLED'
  // 会议相关
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'
  | 'MEETING_FINISHED'
  // 场地扩展
  | 'VENUE_MAINTENANCE'
  // 响应仲裁
  | 'ARBITRATE'
  | 'REQUEST_MODIFY'
  | 'REQUEST_ABANDON'
  // Token 发放
  | 'TOKEN_GRANT_APPROVED'
  | 'TOKEN_GRANT_REJECTED'
  // 投票
  | 'CLOSE'
  | 'CANCEL'
  // 需求/响应
  | 'ACCEPT'
  | 'REMOVE'
  // 新闻
  | 'LINK'
  | 'UNLINK'
  // 反馈
  | 'PROCESS';

// 对象类型
export type AuditObjectType =
  | 'USER'
  | 'PROJECT'
  | 'DEMAND'
  | 'RESPONSE'
  | 'RESOURCE'
  | 'NETWORK_RESOURCE'
  | 'REFERRAL'
  | 'MEETING'
  | 'VENUE_BOOKING'
  | 'TOKEN_TRANSACTION'
  | 'TOKEN_GRANT_TASK'
  | 'POST'
  | 'COMMENT'
  | 'VOTE'
  | 'ANNOUNCEMENT'
  | 'NEWS'
  // 扩展类型
  | 'VENUE'
  | 'VALUE_RECORD'
  | 'PROJECT_NEWS'
  | 'FEEDBACK'
  | 'PROJECT_JOIN_REQUEST'
  | 'PROJECT_MEMBER'
  | 'NEWS_SOURCE'
  | 'PROJECT_SHARES';

/**
 * 审计日志参数
 */
export interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  objectType: AuditObjectType;
  objectId: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 创建审计日志
 */
export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        objectType: params.objectType,
        objectId: params.objectId,
        summary: params.summary,
        metadata: params.metadata as object ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    logger.debug({
      type: 'audit_log',
      ...params,
    }, `Audit: ${params.action} ${params.objectType} ${params.objectId}`);
  } catch (error) {
    // 审计日志失败不应影响主业务流程
    logger.error({
      type: 'audit_log_error',
      error,
      params,
    }, '审计日志记录失败');
  }
};

/**
 * 从请求中提取客户端信息
 */
export const extractClientInfo = (req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): { ipAddress?: string; userAgent?: string } => {
  return {
    ipAddress: req.ip ?? req.socket?.remoteAddress,
    userAgent: req.headers?.['user-agent'] as string | undefined,
  };
};

/**
 * 构建审计摘要
 */
export const buildAuditSummary = (
  action: AuditAction,
  objectType: AuditObjectType,
  details?: Record<string, unknown>
): string => {
  const actionLabels: Record<AuditAction, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    DELETE: '删除',
    SOFT_DELETE: '软删除',
    RESTORE: '恢复',
    APPROVE: '通过',
    REJECT: '拒绝',
    LOGIN: '登录',
    LOGOUT: '登出',
    PASSWORD_RESET: '重置密码',
    TOKEN_TRANSFER: 'Token转账',
    TOKEN_GRANT: 'Token发放',
    TOKEN_DEDUCT: 'Token扣除',
    ADMIN_OVERRIDE: '管理员覆盖',
    VISIBILITY_CHANGE: '可见性变更',
    // 预约相关
    BOOKING_CREATED: '创建预约',
    BOOKING_UPDATED: '更新预约',
    BOOKING_CANCELLED: '取消预约',
    BOOKING_ADMIN_OVERRIDE: '管理员覆盖预约',
    BOOKING_FINISHED: '完成预约',
    // 场地相关
    VENUE_CREATED: '创建场地',
    VENUE_UPDATED: '更新场地',
    VENUE_DISABLED: '停用场地',
    VENUE_ENABLED: '启用场地',
    // 会议相关
    MEETING_CREATED: '创建会议',
    MEETING_UPDATED: '更新会议',
    MEETING_CANCELLED: '取消会议',
    // Token 发放
    TOKEN_GRANT_APPROVED: '批准Token发放',
    TOKEN_GRANT_REJECTED: '拒绝Token发放',
    // 投票
    CLOSE: '关闭',
    CANCEL: '取消',
    // 需求/响应
    ACCEPT: '接受',
    REMOVE: '移除',
    // 新闻
    LINK: '关联',
    UNLINK: '取消关联',
    // 反馈
    PROCESS: '处理',
    // 扩展
    MEETING_FINISHED: '完成会议',
    VENUE_MAINTENANCE: '场地维护',
    ARBITRATE: '仲裁',
    REQUEST_MODIFY: '请求修改',
    REQUEST_ABANDON: '请求废弃',
  };

  const objectLabels: Record<AuditObjectType, string> = {
    USER: '用户',
    PROJECT: '项目',
    DEMAND: '需求',
    RESPONSE: '响应',
    RESOURCE: '资源',
    NETWORK_RESOURCE: '人脉资源',
    REFERRAL: '引荐',
    MEETING: '会议',
    VENUE_BOOKING: '场地预约',
    TOKEN_TRANSACTION: 'Token交易',
    TOKEN_GRANT_TASK: 'Token发放任务',
    POST: '动态',
    COMMENT: '评论',
    VOTE: '投票',
    ANNOUNCEMENT: '公告',
    NEWS: '新闻',
    // 扩展类型
    VENUE: '场地',
    VALUE_RECORD: '价值记录',
    PROJECT_NEWS: '项目新闻',
    FEEDBACK: '反馈',
    PROJECT_JOIN_REQUEST: '项目加入申请',
    PROJECT_MEMBER: '项目成员',
    NEWS_SOURCE: '新闻源',
    PROJECT_SHARES: '项目股份',
  };

  let summary = `${actionLabels[action]}${objectLabels[objectType]}`;
  
  if (details) {
    const detailStr = Object.entries(details)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    summary += `: ${detailStr}`;
  }

  return summary;
};

