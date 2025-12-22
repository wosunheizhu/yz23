/**
 * 安全工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD 4.5: 全站 HTTPS、密码加密存储、服务端权限校验
 */

import crypto from 'crypto';
import { Request } from 'express';
import { logger } from './logger.js';

/**
 * 生成随机验证码
 */
export const generateVerificationCode = (length: number = 6): string => {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * 生成安全随机字符串
 */
export const generateSecureToken = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * 生成 UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * 计算字符串的 SHA256 哈希
 */
export const sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * 计算 HMAC-SHA256
 */
export const hmacSha256 = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * 比较两个字符串（防止时序攻击）
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * 敏感数据脱敏
 */
export const maskSensitiveData = {
  /** 手机号脱敏：138****8000 */
  phone: (phone: string): string => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  },
  
  /** 邮箱脱敏：a****@example.com */
  email: (email: string): string => {
    if (!email) return email;
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}****@${domain}`;
  },
  
  /** 身份证脱敏：1101**********1234 */
  idCard: (idCard: string): string => {
    if (!idCard || idCard.length < 8) return idCard;
    return idCard.slice(0, 4) + '**********' + idCard.slice(-4);
  },
  
  /** 银行卡脱敏：6222 **** **** 1234 */
  bankCard: (card: string): string => {
    if (!card || card.length < 8) return card;
    return card.slice(0, 4) + ' **** **** ' + card.slice(-4);
  },
  
  /** 姓名脱敏：张* / 张*明 */
  name: (name: string): string => {
    if (!name) return name;
    if (name.length === 2) return name[0] + '*';
    if (name.length === 3) return name[0] + '*' + name[2];
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  },
};

/**
 * 提取客户端 IP
 * 考虑反向代理的情况
 */
export const getClientIP = (req: Request): string => {
  // 检查 X-Forwarded-For（反向代理设置）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  
  // 检查 X-Real-IP（Nginx 设置）
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return typeof realIP === 'string' ? realIP : realIP[0];
  }
  
  // 直接获取
  return req.socket.remoteAddress || '';
};

/**
 * 检查是否为内网 IP
 */
export const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  // 10.x.x.x
  if (parts[0] === 10) return true;
  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.x.x.x (localhost)
  if (parts[0] === 127) return true;
  
  return false;
};

/**
 * 检测可疑请求
 */
export const detectSuspiciousRequest = (req: Request): {
  suspicious: boolean;
  reasons: string[];
} => {
  const reasons: string[] = [];
  
  // 检查 User-Agent
  const ua = req.headers['user-agent'];
  if (!ua) {
    reasons.push('Missing User-Agent');
  } else if (ua.length < 10) {
    reasons.push('Suspicious User-Agent');
  }
  
  // 检查是否有常见的注入模式
  const url = req.originalUrl;
  const suspiciousPatterns = [
    /(\<script|javascript:|data:)/i,
    /(union|select|insert|update|delete|drop|exec)/i,
    /(\.\.\/)/, // 路径遍历
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      reasons.push('Suspicious URL pattern');
      break;
    }
  }
  
  if (reasons.length > 0) {
    logger.warn({
      type: 'suspicious_request',
      ip: getClientIP(req),
      url: req.originalUrl,
      reasons,
    }, '检测到可疑请求');
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
  };
};

/**
 * XSS 转义
 */
export const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
};

/**
 * 清理用户输入
 */
export const sanitizeInput = (input: string): string => {
  // 移除控制字符
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
};






