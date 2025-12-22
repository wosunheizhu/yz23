/**
 * 通知服务框架
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #16: 该 Node 引入的新事件，站内通知至少覆盖；若要求邮件则 outbox 可见
 * PRD 4.3: 站内可追溯 + 邮件强触达
 */

import { prisma } from './db.js';
import { logger } from './logger.js';

/**
 * 通知渠道
 */
export type NotificationChannel = 'INBOX' | 'EMAIL';

/**
 * 通知事件类型
 * PRD 21.2: 必须发邮件的事件清单
 */
export type NotificationEventType =
  // 登录安全类
  | 'PASSWORD_RESET'
  | 'LOGIN_ANOMALY'
  // 项目类 (PRD 21.2.A)
  | 'PROJECT_APPROVED'
  | 'PROJECT_REJECTED'
  | 'PROJECT_JOIN_APPROVED'
  | 'PROJECT_JOIN_REJECTED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_EVENT_ADDED'
  // 需求类 (PRD 21.2.B)
  | 'DEMAND_PUBLISHED'
  | 'DEMAND_NEW_RESPONSE'
  | 'DEMAND_CLOSED'
  | 'DEMAND_CANCELLED'
  | 'RESPONSE_SUBMITTED'
  | 'RESPONSE_ACCEPTED'
  | 'RESPONSE_REJECTED'
  | 'RESPONSE_MODIFIED'
  | 'RESPONSE_ABANDONED'
  // 响应修改/废弃 (PRD 21.2.C)
  | 'RESPONSE_MODIFY_REQUEST'
  | 'RESPONSE_ABANDON_REQUEST'
  | 'RESPONSE_MODIFY_ACCEPTED'
  | 'RESPONSE_MODIFY_REJECTED'
  | 'RESPONSE_ADMIN_ARBITRATION'
  // Token类 (PRD 21.2.D)
  | 'TOKEN_PENDING_APPROVAL'
  | 'TOKEN_APPROVED'
  | 'TOKEN_REJECTED'
  | 'TOKEN_PENDING_CONFIRM'
  | 'TOKEN_COMPLETED'
  | 'TOKEN_ADMIN_GRANT'
  | 'TOKEN_ADMIN_DEDUCT'
  | 'TOKEN_MEETING_REWARD'
  | 'TOKEN_GRANT_APPROVED'
  | 'TOKEN_GRANT_REJECTED'
  // 日历类 (PRD 21.2.E)
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CONFLICT'
  | 'BOOKING_ADMIN_OVERRIDE'
  | 'MEETING_INVITED'
  | 'MEETING_TIME_CHANGED'
  | 'MEETING_CHANGED'
  | 'MEETING_CANCELLED'
  | 'MEETING_FINISHED'
  // 社群类 (PRD 21.2.F)
  | 'MENTION'              // 向后兼容
  | 'COMMUNITY_MENTIONED'  // 新标准
  | 'COMMENT_REPLY'
  | 'COMMUNITY_REPLY'      // 新标准
  | 'POST_DELETED'
  | 'COMMUNITY_POST_DELETED' // 新标准
  // 私聊类 (PRD 21.2.G)
  | 'NEW_MESSAGE'
  | 'DM_NEW_MESSAGE'       // 新标准
  // 人脉资源 (PRD 21.2.H)
  | 'NETWORK_RESOURCE_CREATED'
  | 'NETWORK_REFERRAL_SUBMITTED'
  | 'NETWORK_REFERRAL_LINKED'
  // 投票类 (PRD 21.2.I)
  | 'VOTE_CREATED'
  | 'VOTE_CLOSED'
  | 'VOTE_DEADLINE_REMINDER'
  // 私信类扩展
  | 'DM_RECEIVED'
  // 评论类扩展
  | 'COMMENT_REPLIED'
  // 公告类
  | 'ANNOUNCEMENT'
  // 反馈类
  | 'FEEDBACK_SUBMITTED'
  | 'FEEDBACK_PROCESSED'
  // 需求响应扩展
  | 'DEMAND_RESPONSE_APPROVED'
  | 'DEMAND_RESPONSE_REJECTED'
  // Token 扩展
  | 'TOKEN_TRANSFER_INITIATED'
  | 'TOKEN_TRANSFER_APPROVED'
  | 'TOKEN_TRANSFER_REJECTED'
  | 'TOKEN_TRANSFER_CONFIRMED'
  | 'TOKEN_TRANSFER_RECEIVER_REJECTED'
  // 预约扩展
  | 'BOOKING_CONFLICT_FAILED'
  | 'BOOKING_FINISHED';

/**
 * 通知优先级
 */
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * 通知参数
 */
export interface NotificationParams {
  eventType: NotificationEventType;
  targetUserId?: string; // 单个用户（向后兼容）
  targetUserIds?: string[]; // 多个用户（PRD 21.1）
  actorUserId?: string;
  actorId?: string; // actorUserId 别名
  title: string;
  content: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  dedupeKey?: string; // 防重复键
  metadata?: Record<string, unknown>;
  type?: string; // 兼容旧代码
}

/**
 * 发送通知
 * 同时创建站内信箱记录和邮件发送任务
 * PRD 21.1: 支持批量发送给多个用户
 * 
 * 注意：邮件发送功能暂时禁用，只发送站内信箱
 */
export const sendNotification = async (params: NotificationParams): Promise<void> => {
  // 暂时禁用邮件发送，只使用站内信箱
  const channels = params.channels ?? ['INBOX'];
  // 原代码: const channels = params.channels ?? ['INBOX', 'EMAIL'];
  
  // 支持单个用户或多个用户
  const targetUserIds = params.targetUserIds ?? (params.targetUserId ? [params.targetUserId] : []);
  
  if (targetUserIds.length === 0) {
    logger.warn({ eventType: params.eventType }, '通知没有目标用户');
    return;
  }
  
  logger.info({
    eventType: params.eventType,
    targetUserCount: targetUserIds.length,
    channels,
  }, '发送通知');
  
  // 为每个用户发送通知
  const promises: Promise<unknown>[] = [];
  
  for (const userId of targetUserIds) {
    const userParams = { ...params, targetUserId: userId };
    
    // 站内信箱
    if (channels.includes('INBOX')) {
      promises.push(createInboxItem(userParams));
    }
    
    // 邮件 Outbox
    if (channels.includes('EMAIL')) {
      promises.push(createEmailOutbox(userParams));
    }
  }
  
  await Promise.all(promises);
};

/**
 * 创建站内信箱消息
 */
const createInboxItem = async (params: NotificationParams): Promise<void> => {
  try {
    // 转换本地 InboxCategory 到 Prisma InboxCategory
    const category = mapEventTypeToCategory(params.eventType);
    await prisma.inboxItem.create({
      data: {
        userId: params.targetUserId!,
        category: category as any, // Prisma 枚举类型兼容
        title: params.title,
        content: params.content,
        relatedObjectType: params.relatedObjectType,
        relatedObjectId: params.relatedObjectId,
        isRead: false,
      },
    });
    
    logger.debug({ eventType: params.eventType }, '站内信箱消息已创建');
  } catch (error) {
    logger.error({ error, params }, '创建站内信箱消息失败');
    // 不抛出错误，确保其他渠道继续处理
  }
};

/**
 * 创建邮件发送任务（Outbox 模式）
 */
const createEmailOutbox = async (params: NotificationParams): Promise<void> => {
  try {
    // 检查重复
    if (params.dedupeKey) {
      const existing = await prisma.notificationOutbox.findFirst({
        where: {
          dedupeKey: params.dedupeKey,
          status: { in: ['PENDING', 'SENT'] },
        },
      });
      
      if (existing) {
        logger.debug({ dedupeKey: params.dedupeKey }, '邮件通知已存在，跳过');
        return;
      }
    }
    
    await prisma.notificationOutbox.create({
      data: {
        channel: 'EMAIL',
        eventType: params.eventType,
        actorUserId: params.actorUserId,
        targetUserId: params.targetUserId!,
        title: params.title,
        content: params.content,
        relatedObjectType: params.relatedObjectType,
        relatedObjectId: params.relatedObjectId,
        status: 'PENDING',
        dedupeKey: params.dedupeKey,
      },
    });
    
    logger.debug({ eventType: params.eventType }, '邮件发送任务已创建');
  } catch (error) {
    logger.error({ error, params }, '创建邮件发送任务失败');
  }
};

/**
 * 信箱分类类型（与 Prisma InboxCategory 枚举对应）
 */
export type InboxCategory = 
  | 'SYSTEM' 
  | 'PROJECT' 
  | 'DEMAND' 
  | 'RESPONSE' 
  | 'TOKEN' 
  | 'MEETING' 
  | 'BOOKING' 
  | 'NETWORK' 
  | 'COMMUNITY' 
  | 'DM';

/**
 * 映射事件类型到信箱分类
 * PRD 21.2: 按事件类型分类
 */
const mapEventTypeToCategory = (eventType: NotificationEventType): InboxCategory => {
  // 项目相关
  if (eventType.startsWith('PROJECT_')) {
    return 'PROJECT';
  }
  // 需求相关
  if (eventType.startsWith('DEMAND_') || eventType === 'RESPONSE_SUBMITTED') {
    return 'DEMAND';
  }
  // 响应相关
  if (eventType.startsWith('RESPONSE_')) {
    return 'RESPONSE';
  }
  // Token 相关
  if (eventType.startsWith('TOKEN_')) {
    return 'TOKEN';
  }
  // 预约相关
  if (eventType.startsWith('BOOKING_')) {
    return 'BOOKING';
  }
  // 会议相关
  if (eventType.startsWith('MEETING_')) {
    return 'MEETING';
  }
  // 私聊相关
  if (eventType === 'NEW_MESSAGE' || eventType === 'DM_NEW_MESSAGE' || eventType === 'DM_RECEIVED') {
    return 'DM';
  }
  // 社群相关（投票、评论、@提醒等）
  if (eventType === 'MENTION' || eventType === 'COMMUNITY_MENTIONED' || 
      eventType === 'COMMENT_REPLY' || eventType === 'COMMUNITY_REPLY' || 
      eventType === 'COMMENT_REPLIED' ||
      eventType === 'POST_DELETED' || eventType === 'COMMUNITY_POST_DELETED' ||
      eventType === 'VOTE_CREATED' || eventType === 'VOTE_CLOSED' || eventType === 'VOTE_DEADLINE_REMINDER') {
    return 'COMMUNITY';
  }
  // 人脉相关
  if (eventType.startsWith('NETWORK_') || eventType.includes('REFERRAL')) {
    return 'NETWORK';
  }
  // 默认系统通知（公告、反馈等）
  return 'SYSTEM';
};

/**
 * 批量发送通知
 */
export const sendBulkNotifications = async (
  notifications: NotificationParams[]
): Promise<void> => {
  logger.info({ count: notifications.length }, '批量发送通知');
  
  // 并行发送，但限制并发数
  const BATCH_SIZE = 10;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(sendNotification));
  }
};

/**
 * 生成通知去重键
 */
export const generateDedupeKey = (
  eventType: string,
  targetUserId: string,
  relatedObjectId?: string
): string => {
  return `${eventType}:${targetUserId}:${relatedObjectId ?? 'none'}`;
};

/**
 * 通知模板接口（为后续邮件模板预留）
 */
export interface NotificationTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

/**
 * 根据事件类型获取通知标题模板
 */
export const getNotificationTitle = (
  eventType: NotificationEventType,
  vars: Record<string, string> = {}
): string => {
  const templates: Record<NotificationEventType, string> = {
    // 登录安全
    PASSWORD_RESET: '密码重置验证码',
    LOGIN_ANOMALY: '登录安全提醒',
    // 项目
    PROJECT_APPROVED: '项目审核通过',
    PROJECT_REJECTED: '项目审核未通过',
    PROJECT_JOIN_APPROVED: '加入项目申请通过',
    PROJECT_JOIN_REJECTED: '加入项目申请未通过',
    PROJECT_STATUS_CHANGED: '项目状态变更',
    PROJECT_EVENT_ADDED: '项目有新动态',
    // 需求
    DEMAND_PUBLISHED: '新需求发布',
    DEMAND_NEW_RESPONSE: '需求有新响应',
    DEMAND_CLOSED: '需求已关闭',
    DEMAND_CANCELLED: '需求已取消',
    RESPONSE_SUBMITTED: '收到新的需求响应',
    RESPONSE_ACCEPTED: '您的响应已被接受',
    RESPONSE_REJECTED: '您的响应未被接受',
    RESPONSE_MODIFIED: '响应条款已修改',
    RESPONSE_ABANDONED: '响应已废弃',
    // 响应修改/废弃
    RESPONSE_MODIFY_REQUEST: '响应修改申请',
    RESPONSE_ABANDON_REQUEST: '响应废弃申请',
    RESPONSE_MODIFY_ACCEPTED: '响应修改已接受',
    RESPONSE_MODIFY_REJECTED: '响应修改被拒绝',
    RESPONSE_ADMIN_ARBITRATION: '管理员裁决结果',
    // Token
    TOKEN_PENDING_APPROVAL: 'Token 交易待审核',
    TOKEN_APPROVED: 'Token 交易已通过',
    TOKEN_REJECTED: 'Token 交易未通过',
    TOKEN_PENDING_CONFIRM: 'Token 待您确认收款',
    TOKEN_COMPLETED: 'Token 交易已完成',
    TOKEN_ADMIN_GRANT: '您收到 Token 奖励',
    TOKEN_ADMIN_DEDUCT: 'Token 账户变动通知',
    TOKEN_MEETING_REWARD: '座谈会邀请奖励发放',
    TOKEN_GRANT_APPROVED: '座谈会奖励已发放',
    TOKEN_GRANT_REJECTED: '座谈会奖励发放被拒绝',
    // 日历
    BOOKING_CREATED: '场地预约成功',
    BOOKING_UPDATED: '场地预约已修改',
    BOOKING_CANCELLED: '场地预约已取消',
    BOOKING_CONFLICT: '场地预约时间冲突',
    BOOKING_ADMIN_OVERRIDE: '场地预约被管理员调整',
    MEETING_INVITED: '您被邀请参加会议',
    MEETING_TIME_CHANGED: '会议时间变更',
    MEETING_CHANGED: '会议信息变更',
    MEETING_CANCELLED: '会议已取消',
    MEETING_FINISHED: '会议已结束',
    // 社群（兼容新旧命名）
    MENTION: '有人 @ 了您',
    COMMUNITY_MENTIONED: '有人 @ 了您',
    COMMENT_REPLY: '您的评论收到回复',
    COMMUNITY_REPLY: '您的评论收到回复',
    POST_DELETED: '动态已被删除',
    COMMUNITY_POST_DELETED: '动态已被删除',
    // 私聊（兼容新旧命名）
    NEW_MESSAGE: '您有新消息',
    DM_NEW_MESSAGE: '您有新私信',
    // 人脉资源
    NETWORK_RESOURCE_CREATED: '人脉资源创建成功',
    NETWORK_REFERRAL_SUBMITTED: '人脉引荐提交成功',
    NETWORK_REFERRAL_LINKED: '人脉引荐已关联',
    // 投票
    VOTE_CREATED: '新投票已创建',
    VOTE_CLOSED: '投票已结束',
    VOTE_DEADLINE_REMINDER: '投票即将截止',
    // 私信扩展
    DM_RECEIVED: '您收到新私信',
    // 评论扩展
    COMMENT_REPLIED: '您的评论收到回复',
    // 公告
    ANNOUNCEMENT: '新公告发布',
    // 反馈
    FEEDBACK_SUBMITTED: '反馈已提交',
    FEEDBACK_PROCESSED: '您的反馈已处理',
    // 需求响应扩展
    DEMAND_RESPONSE_APPROVED: '您的响应已通过',
    DEMAND_RESPONSE_REJECTED: '您的响应未通过',
    // Token 扩展
    TOKEN_TRANSFER_INITIATED: 'Token 转让已发起',
    TOKEN_TRANSFER_APPROVED: 'Token 转让已通过',
    TOKEN_TRANSFER_REJECTED: 'Token 转让未通过',
    TOKEN_TRANSFER_CONFIRMED: 'Token 转让已确认',
    TOKEN_TRANSFER_RECEIVER_REJECTED: 'Token 转让接收方拒绝',
    // 预约扩展
    BOOKING_CONFLICT_FAILED: '预约时间冲突',
    BOOKING_FINISHED: '预约已完成',
  };
  
  let title = templates[eventType] || '系统通知';
  
  // 替换变量
  for (const [key, value] of Object.entries(vars)) {
    title = title.replace(`{{${key}}}`, value);
  }
  
  return title;
};

