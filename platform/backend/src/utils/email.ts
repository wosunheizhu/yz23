/**
 * 邮件发送工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD D: 用户的所有操作，以及所有与其相关事件，都必须收到信件（Email）
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

/**
 * 邮件发送参数
 */
export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * 邮件发送结果
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 创建邮件传输器
 */
let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

/**
 * 发送邮件
 */
export const sendEmail = async (params: EmailParams): Promise<EmailResult> => {
  try {
    // 检查SMTP配置
    if (!config.smtp.host || !config.smtp.user) {
      logger.warn('SMTP未配置，跳过邮件发送');
      return { success: false, error: 'SMTP not configured' };
    }
    
    const transport = getTransporter();
    
    const info = await transport.sendMail({
      from: config.smtp.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    logger.info({
      to: params.to,
      subject: params.subject,
      messageId: info.messageId,
    }, '邮件发送成功');
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      to: params.to,
      subject: params.subject,
      error: errorMessage,
    }, '邮件发送失败');
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * 处理 Outbox 中待发送的邮件
 * 应由定时任务调用
 */
export const processEmailOutbox = async (batchSize: number = 10): Promise<number> => {
  const pending = await prisma.notificationOutbox.findMany({
    where: {
      channel: 'EMAIL',
      status: 'PENDING',
    },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });
  
  if (pending.length === 0) {
    return 0;
  }
  
  logger.info({ count: pending.length }, '处理邮件发送队列');
  
  let successCount = 0;
  
  for (const item of pending) {
    // 获取用户邮箱
    const user = await prisma.user.findUnique({
      where: { id: item.targetUserId },
      select: { email: true, name: true },
    });
    
    if (!user?.email) {
      await prisma.notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          errorMessage: 'User email not found',
        },
      });
      continue;
    }
    
    const result = await sendEmail({
      to: user.email,
      subject: item.title,
      text: item.content,
      html: generateEmailHtml(item.title, item.content, user.name),
    });
    
    await prisma.notificationOutbox.update({
      where: { id: item.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      },
    });
    
    if (result.success) {
      successCount++;
    }
  }
  
  logger.info({
    total: pending.length,
    success: successCount,
    failed: pending.length - successCount,
  }, '邮件发送队列处理完成');
  
  return successCount;
};

/**
 * 生成邮件 HTML 模板
 */
const generateEmailHtml = (
  title: string,
  content: string,
  userName?: string | null
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1a1a1a;
      color: #D4AF37;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 300;
      letter-spacing: 2px;
    }
    .content {
      background-color: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .message {
      font-size: 14px;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>元征 · 合伙人赋能平台</h1>
    </div>
    <div class="content">
      ${userName ? `<p class="greeting">尊敬的 ${userName}：</p>` : ''}
      <div class="message">${content}</div>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复</p>
      <p>© ${new Date().getFullYear()} 元征 · 合伙人赋能平台</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * 发送验证码邮件
 */
export const sendVerificationCodeEmail = async (
  to: string,
  code: string,
  type: 'login' | 'reset_password' | 'verify_email'
): Promise<EmailResult> => {
  const typeLabels = {
    login: '登录',
    reset_password: '重置密码',
    verify_email: '邮箱验证',
  };
  
  const subject = `【元征平台】${typeLabels[type]}验证码`;
  const content = `您的${typeLabels[type]}验证码是：${code}\n\n验证码有效期为 10 分钟，请勿泄露给他人。\n\n如非本人操作，请忽略此邮件。`;
  
  return sendEmail({
    to,
    subject,
    text: content,
    html: generateEmailHtml(subject, content),
  });
};

/**
 * 重试失败的邮件发送
 */
export const retryFailedEmails = async (
  maxRetries: number = 3,
  batchSize: number = 10
): Promise<number> => {
  // 这里应该有重试逻辑，需要在 Outbox 表中添加 retryCount 字段
  // 简化实现：重新处理 FAILED 状态的记录
  const failed = await prisma.notificationOutbox.findMany({
    where: {
      channel: 'EMAIL',
      status: 'FAILED',
    },
    take: batchSize,
  });
  
  if (failed.length === 0) {
    return 0;
  }
  
  // 重置状态为 PENDING
  await prisma.notificationOutbox.updateMany({
    where: {
      id: { in: failed.map(f => f.id) },
    },
    data: {
      status: 'PENDING',
      errorMessage: null,
    },
  });
  
  // 重新处理
  return processEmailOutbox(batchSize);
};






