/**
 * 邮件处理后台任务 - Node 8
 * PRD 21.5: 邮件必达，失败可重试
 */

import { prisma } from '../utils/db.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import nodemailer from 'nodemailer';

// ================================
// 配置
// ================================

const PROCESS_INTERVAL = 10 * 1000; // 10秒处理一次
const BATCH_SIZE = 50; // 每批处理数量
const MAX_RETRY_COUNT = 5;

// ================================
// 邮件发送器
// ================================

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

// ================================
// 邮件模板
// ================================

const generateEmailHtml = (title: string, content: string, actionUrl?: string): string => {
  const appName = '元征合伙人赋能平台';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #d4af37; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #1a1a2e; }
    .message { color: #555; margin-bottom: 24px; white-space: pre-wrap; }
    .button { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${appName}</h1>
  </div>
  <div class="content">
    <div class="title">${title}</div>
    <div class="message">${content}</div>
    ${actionUrl ? `<a href="${actionUrl}" class="button">查看详情</a>` : ''}
  </div>
  <div class="footer">
    <p>此邮件由系统自动发送，请勿直接回复。</p>
    <p>© ${new Date().getFullYear()} ${appName}</p>
  </div>
</body>
</html>
  `.trim();
};

// ================================
// 处理逻辑
// ================================

/**
 * 处理待发送的邮件
 */
const processPendingEmails = async (): Promise<number> => {
  const now = new Date();
  
  // 获取待处理的邮件
  const pendingEmails = await prisma.notificationOutbox.findMany({
    where: {
      channel: 'EMAIL',
      status: 'PENDING',
      retryCount: { lt: MAX_RETRY_COUNT },
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (pendingEmails.length === 0) {
    return 0;
  }

  logger.debug({ count: pendingEmails.length }, '处理待发送邮件');

  let successCount = 0;

  for (const outbox of pendingEmails) {
    try {
      // 获取用户邮箱
      const user = await prisma.user.findUnique({
        where: { id: outbox.targetUserId },
        select: { email: true },
      });

      if (!user?.email) {
        await prisma.notificationOutbox.update({
          where: { id: outbox.id },
          data: {
            status: 'FAILED',
            errorMessage: '用户邮箱不存在',
            retryCount: MAX_RETRY_COUNT,
          },
        });
        continue;
      }

      // 生成跳转链接
      const baseUrl = config.frontendUrl || 'https://app.yuanzheng.com';
      let actionUrl = baseUrl;
      if (outbox.relatedObjectType && outbox.relatedObjectId) {
        const urlMap: Record<string, string> = {
          PROJECT: `/projects/${outbox.relatedObjectId}`,
          DEMAND: `/demands/${outbox.relatedObjectId}`,
          RESPONSE: `/responses/${outbox.relatedObjectId}`,
          MEETING: `/meetings/${outbox.relatedObjectId}`,
          VENUE_BOOKING: `/bookings/${outbox.relatedObjectId}`,
          TOKEN_TRANSACTION: `/tokens/transactions/${outbox.relatedObjectId}`,
          NETWORK_RESOURCE: `/network-resources/${outbox.relatedObjectId}`,
        };
        actionUrl = baseUrl + (urlMap[outbox.relatedObjectType] || '/inbox');
      }

      // 发送邮件
      const transport = getTransporter();
      await transport.sendMail({
        from: config.smtp.from,
        to: user.email,
        subject: outbox.title,
        html: generateEmailHtml(outbox.title, outbox.content, actionUrl),
        text: `${outbox.title}\n\n${outbox.content}\n\n查看详情: ${actionUrl}`,
      });

      // 更新状态为已发送
      await prisma.notificationOutbox.update({
        where: { id: outbox.id },
        data: {
          status: 'SENT',
          sentAt: now,
        },
      });

      successCount++;
      logger.debug({ outboxId: outbox.id, email: user.email }, '邮件发送成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const retryCount = outbox.retryCount + 1;
      
      // 指数退避：1min, 2min, 4min, 8min, 16min
      const nextRetryDelay = Math.min(Math.pow(2, retryCount) * 60 * 1000, 24 * 60 * 60 * 1000);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await prisma.notificationOutbox.update({
        where: { id: outbox.id },
        data: {
          status: retryCount >= MAX_RETRY_COUNT ? 'FAILED' : 'PENDING',
          errorMessage,
          retryCount,
          nextRetryAt: retryCount < MAX_RETRY_COUNT ? nextRetryAt : null,
        },
      });

      logger.warn({ outboxId: outbox.id, error: errorMessage, retryCount }, '邮件发送失败');
    }
  }

  return successCount;
};

/**
 * 处理需要重试的失败邮件
 */
const processRetryEmails = async (): Promise<number> => {
  const now = new Date();
  
  // 获取可重试的失败邮件（已到重试时间）
  const retryEmails = await prisma.notificationOutbox.findMany({
    where: {
      channel: 'EMAIL',
      status: 'FAILED',
      retryCount: { lt: MAX_RETRY_COUNT },
      nextRetryAt: { lte: now },
    },
    orderBy: { nextRetryAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (retryEmails.length === 0) {
    return 0;
  }

  logger.debug({ count: retryEmails.length }, '处理重试邮件');

  // 将状态改回 PENDING 以便重新处理
  await prisma.notificationOutbox.updateMany({
    where: {
      id: { in: retryEmails.map(e => e.id) },
    },
    data: {
      status: 'PENDING',
    },
  });

  return retryEmails.length;
};

// ================================
// 启动器
// ================================

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * 启动邮件处理器
 */
export const startEmailProcessor = (): void => {
  if (!config.smtp.host) {
    logger.warn('SMTP 未配置，邮件处理器未启动');
    return;
  }

  logger.info({ interval: PROCESS_INTERVAL }, '启动邮件处理器');

  // 立即运行一次
  runProcessor();

  // 定时运行
  intervalId = setInterval(runProcessor, PROCESS_INTERVAL);
};

/**
 * 停止邮件处理器
 */
export const stopEmailProcessor = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('邮件处理器已停止');
  }
};

/**
 * 运行处理器
 */
const runProcessor = async (): Promise<void> => {
  try {
    const retryCount = await processRetryEmails();
    const sentCount = await processPendingEmails();
    
    if (retryCount > 0 || sentCount > 0) {
      logger.info({ retryCount, sentCount }, '邮件处理完成');
    }
  } catch (error) {
    logger.error({ error }, '邮件处理器错误');
  }
};

export default { startEmailProcessor, stopEmailProcessor };

