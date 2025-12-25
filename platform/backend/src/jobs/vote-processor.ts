/**
 * 投票处理后台任务 - Node 10
 * PRD 6.10.4: 投票截止时间到达后，状态自动变为 CLOSED
 * PRD 6.11.3: 投票即将截止提示
 */

import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { sendNotification } from '../utils/notification.js';

// ================================
// 配置
// ================================

const PROCESS_INTERVAL = 60 * 1000; // 1分钟处理一次
const REMINDER_HOURS = 24; // 提前24小时提醒

let processorInterval: NodeJS.Timeout | null = null;

// 记录已发送提醒的投票ID，避免重复发送
const sentReminders = new Set<string>();

// ================================
// 自动关闭过期投票
// ================================

/**
 * 关闭所有过期的投票
 * PRD 6.10.4: 投票截止时间到达后，状态自动变为 CLOSED
 */
const closeExpiredVotes = async (): Promise<void> => {
  try {
    const now = new Date();

    // 查找所有过期但仍然开放的投票
    const expiredVotes = await prisma.vote.findMany({
      where: {
        status: 'OPEN',
        deadline: { lt: now },
        isDeleted: false,
      },
      include: {
        records: {
          select: { userId: true },
        },
      },
    });

    if (expiredVotes.length === 0) {
      return;
    }

    logger.info({ count: expiredVotes.length }, '发现过期投票，开始自动关闭');

    for (const vote of expiredVotes) {
      try {
        // 更新投票状态为关闭
        await prisma.vote.update({
          where: { id: vote.id },
          data: { status: 'CLOSED' },
        });

        // 通知所有投票参与者
        const participantIds = vote.records.map((r) => r.userId);
        if (participantIds.length > 0) {
          await sendNotification({
            eventType: 'VOTE_CLOSED',
            actorId: vote.creatorId,
            targetUserIds: participantIds,
            title: '投票已结束',
            content: `投票"${vote.title}"已截止，请查看结果`,
            relatedObjectType: 'VOTE',
            relatedObjectId: vote.id,
            channels: ['INBOX'],
          });
        }

        logger.info({ voteId: vote.id, title: vote.title }, '投票已自动关闭');
      } catch (error) {
        logger.error({ error, voteId: vote.id }, '关闭投票失败');
      }
    }
  } catch (error) {
    logger.error({ error }, '投票处理任务执行失败');
  }
};

// ================================
// 投票即将截止提醒
// ================================

/**
 * 发送投票即将截止提醒
 * PRD 6.11.3: 投票即将截止提示
 */
const sendDeadlineReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + REMINDER_HOURS * 60 * 60 * 1000);

    // 查找即将截止（24小时内）但尚未发送提醒的开放投票
    const upcomingVotes = await prisma.vote.findMany({
      where: {
        status: 'OPEN',
        deadline: {
          gt: now,
          lt: reminderThreshold,
        },
        isDeleted: false,
      },
      include: {
        records: {
          select: { userId: true },
        },
      },
    });

    for (const vote of upcomingVotes) {
      // 检查是否已发送提醒
      if (sentReminders.has(vote.id)) {
        continue;
      }

      try {
        // 获取尚未投票的用户
        const votedUserIds = new Set(vote.records.map((r) => r.userId));
        // visibilityUserIds 是 String 数组
        const allVisibleUserIds = vote.visibilityUserIds || [];
        const unvotedUserIds = allVisibleUserIds.filter((id) => !votedUserIds.has(id));

        if (unvotedUserIds.length > 0) {
          // 计算剩余时间
          const remainingHours = Math.round((vote.deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          await sendNotification({
            eventType: 'VOTE_DEADLINE_REMINDER',
            actorId: vote.creatorId,
            targetUserIds: unvotedUserIds,
            title: '投票即将截止',
            content: `投票"${vote.title}"将在 ${remainingHours} 小时后截止，请尽快参与`,
            relatedObjectType: 'VOTE',
            relatedObjectId: vote.id,
            channels: ['INBOX'],
          });

          logger.info({ voteId: vote.id, notifiedCount: unvotedUserIds.length }, '发送投票截止提醒');
        }

        // 标记为已发送提醒
        sentReminders.add(vote.id);
      } catch (error) {
        logger.error({ error, voteId: vote.id }, '发送投票提醒失败');
      }
    }
  } catch (error) {
    logger.error({ error }, '投票提醒任务执行失败');
  }
};

// ================================
// 主处理循环
// ================================

const processVotes = async (): Promise<void> => {
  await closeExpiredVotes();
  await sendDeadlineReminders();
};

// ================================
// 启动/停止处理器
// ================================

/**
 * 检查投票表是否存在
 */
const checkVoteTableExists = async (): Promise<boolean> => {
  try {
    await prisma.vote.findFirst({ take: 1 });
    return true;
  } catch (error) {
    // 表不存在时会抛出错误
    return false;
  }
};

/**
 * 启动投票处理器
 */
export const startVoteProcessor = async (): Promise<void> => {
  if (processorInterval) {
    logger.warn('投票处理器已在运行');
    return;
  }

  logger.info({ interval: PROCESS_INTERVAL }, '启动投票处理器');

  // 检查表是否存在
  const tableExists = await checkVoteTableExists();
  if (!tableExists) {
    logger.warn('投票表不存在，投票处理器未启动（等待数据库迁移）');
    return;
  }

  // 立即执行一次
  processVotes().catch((error) => {
    logger.error({ error }, '投票处理初始执行失败');
  });

  // 定时执行
  processorInterval = setInterval(() => {
    processVotes().catch((error) => {
      logger.error({ error }, '投票处理定时执行失败');
    });
  }, PROCESS_INTERVAL);
};

/**
 * 停止投票处理器
 */
export const stopVoteProcessor = (): void => {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    logger.info('投票处理器已停止');
  }
};

