/**
 * 邮件发送 Service - Node 8
 * PRD 21: 通知中心（邮件强制）
 * PRD 21.5: 邮件必须有 Outbox 能证明已发送/失败原因
 */

import nodemailer from 'nodemailer';
import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// ================================
// 邮件发送器配置
// ================================

let transporter: nodemailer.Transporter | null = null;

/**
 * 检查 SMTP 是否已配置
 */
const isSmtpConfigured = (): boolean => {
  return !!(config.smtp.host && config.smtp.user && config.smtp.pass);
};

/**
 * 获取邮件发送器
 */
const getTransporter = (): nodemailer.Transporter | null => {
  if (!isSmtpConfigured()) {
    logger.warn('SMTP not configured, email sending is disabled');
    return null;
  }
  
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

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * 生成邮件模板
 */
const generateEmailTemplate = (
  title: string,
  content: string,
  relatedObjectType?: string,
  relatedObjectId?: string
): EmailTemplate => {
  const appName = '元征合伙人赋能平台';
  const baseUrl = config.frontendUrl || 'https://app.yuanzheng.com';
  
  // 生成跳转链接
  let actionUrl = baseUrl;
  if (relatedObjectType && relatedObjectId) {
    const urlMap: Record<string, string> = {
      PROJECT: `/projects/${relatedObjectId}`,
      DEMAND: `/demands/${relatedObjectId}`,
      RESPONSE: `/responses/${relatedObjectId}`,
      MEETING: `/meetings/${relatedObjectId}`,
      VENUE_BOOKING: `/bookings/${relatedObjectId}`,
      TOKEN_TRANSACTION: `/tokens/transactions/${relatedObjectId}`,
      NETWORK_RESOURCE: `/network-resources/${relatedObjectId}`,
    };
    actionUrl = baseUrl + (urlMap[relatedObjectType] || '/inbox');
  }

  const html = `
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
    .message { color: #555; margin-bottom: 24px; }
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
    <a href="${actionUrl}" class="button">查看详情</a>
  </div>
  <div class="footer">
    <p>此邮件由系统自动发送，请勿直接回复。</p>
    <p>© ${new Date().getFullYear()} ${appName}</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
${appName}

${title}

${content}

查看详情: ${actionUrl}

---
此邮件由系统自动发送，请勿直接回复。
  `.trim();

  return {
    subject: `[${appName}] ${title}`,
    html,
    text,
  };
};

// ================================
// 邮件发送
// ================================

export interface SendEmailInput {
  to: string;
  title: string;
  content: string;
  eventType: string;
  actorUserId?: string;
  targetUserId: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  dedupeKey?: string;
}

/**
 * 发送邮件并记录到 Outbox
 * PRD 21.5: 必须有 Outbox 能证明已发送/失败原因
 */
export const sendEmail = async (input: SendEmailInput): Promise<string> => {
  const { to, title, content, eventType, actorUserId, targetUserId, relatedObjectType, relatedObjectId, dedupeKey } = input;

  // 去重检查
  if (dedupeKey) {
    const existing = await prisma.notificationOutbox.findFirst({
      where: {
        channel: 'EMAIL',
        dedupeKey,
        status: { in: ['PENDING', 'SENT'] },
      },
    });
    if (existing) {
      logger.info({ dedupeKey }, 'Email deduplicated');
      return existing.id;
    }
  }

  // 创建 Outbox 记录
  const outbox = await prisma.notificationOutbox.create({
    data: {
      channel: 'EMAIL',
      eventType,
      actorUserId,
      targetUserId,
      title,
      content,
      relatedObjectType,
      relatedObjectId,
      status: 'PENDING',
      dedupeKey,
    },
  });

  // 异步发送邮件
  sendEmailAsync(outbox.id, to, title, content, relatedObjectType, relatedObjectId).catch((error) => {
    logger.error({ error, outboxId: outbox.id }, 'Failed to send email');
  });

  return outbox.id;
};

/**
 * 异步发送邮件
 */
const sendEmailAsync = async (
  outboxId: string,
  to: string,
  title: string,
  content: string,
  relatedObjectType?: string,
  relatedObjectId?: string
): Promise<void> => {
  const template = generateEmailTemplate(title, content, relatedObjectType, relatedObjectId);

  try {
    const transport = getTransporter();
    
    // 如果 SMTP 未配置，标记为"已发送（开发模式）"并跳过
    if (!transport) {
      logger.info({ outboxId, to, subject: template.subject }, '[DEV] Email would be sent (SMTP not configured)');
      
      // 更新 Outbox 状态为已发送（开发模式）
      await prisma.notificationOutbox.update({
        where: { id: outboxId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorMessage: '[开发模式] SMTP未配置，邮件已跳过发送',
        },
      });
      return;
    }
    
    await transport.sendMail({
      from: config.smtp.from,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // 更新 Outbox 状态为已发送
    await prisma.notificationOutbox.update({
      where: { id: outboxId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info({ outboxId, to }, 'Email sent successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 获取当前重试次数
    const currentOutbox = await prisma.notificationOutbox.findUnique({
      where: { id: outboxId },
      select: { retryCount: true },
    });
    const retryCount = (currentOutbox?.retryCount || 0) + 1;
    
    // PRD 30.4: 指数退避 - 1min, 2min, 4min, 8min, 16min...
    const nextRetryDelay = Math.min(Math.pow(2, retryCount) * 60 * 1000, 24 * 60 * 60 * 1000); // 最大24小时
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    // 更新 Outbox 状态为失败
    await prisma.notificationOutbox.update({
      where: { id: outboxId },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount,
        nextRetryAt: retryCount < MAX_RETRY_COUNT ? nextRetryAt : null,
      },
    });

    logger.error({ outboxId, to, error: errorMessage, retryCount, nextRetryAt }, 'Email sending failed');
    throw error;
  }
};

// PRD 30.4: 最大重试次数
const MAX_RETRY_COUNT = 5;

/**
 * 计算指数退避延迟（毫秒）
 * PRD 30.4: 失败重试策略 - 指数退避
 */
const calculateBackoffDelay = (retryCount: number): number => {
  // 1min, 2min, 4min, 8min, 16min, 最大 24 小时
  return Math.min(Math.pow(2, retryCount) * 60 * 1000, 24 * 60 * 60 * 1000);
};

/**
 * 重试发送失败的邮件
 * PRD 30.4: 失败重试策略 - 指数退避 + 最大重试次数
 */
export const retryFailedEmails = async (maxRetries: number = MAX_RETRY_COUNT): Promise<number> => {
  const now = new Date();
  
  // 查找可重试的邮件（未超过最大重试次数且已到重试时间）
  const failedEmails = await prisma.notificationOutbox.findMany({
    where: {
      channel: 'EMAIL',
      status: 'FAILED',
      retryCount: { lt: maxRetries },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } },
      ],
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天内
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  let retried = 0;

  for (const outbox of failedEmails) {
    // 获取用户邮箱
    const user = await prisma.user.findUnique({
      where: { id: outbox.targetUserId },
      select: { email: true },
    });

    if (!user?.email) {
      // 标记为永久失败
      await prisma.notificationOutbox.update({
        where: { id: outbox.id },
        data: {
          errorMessage: '用户邮箱不存在',
          retryCount: maxRetries, // 达到最大重试次数
        },
      });
      continue;
    }

    try {
      await sendEmailAsync(
        outbox.id,
        user.email,
        outbox.title,
        outbox.content,
        outbox.relatedObjectType || undefined,
        outbox.relatedObjectId || undefined
      );
      retried++;
    } catch {
      // 失败已记录
    }
  }

  return retried;
};

/**
 * 批量发送邮件
 */
export const sendBatchEmails = async (
  emails: Array<Omit<SendEmailInput, 'to'> & { userId: string }>
): Promise<number> => {
  const userIds = [...new Set(emails.map((e) => e.userId))];
  
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });

  const userEmailMap = new Map(users.map((u) => [u.id, u.email]));
  let sent = 0;

  for (const email of emails) {
    const userEmail = userEmailMap.get(email.userId);
    if (!userEmail) continue;

    try {
      await sendEmail({
        ...email,
        to: userEmail,
      });
      sent++;
    } catch {
      // 错误已记录
    }
  }

  return sent;
};

