/**
 * 认证模块 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.2: 登录方式
 * - 账号 + 密码
 * - 手机/邮箱 + 密码
 * - 手机/邮箱 + 验证码
 * - 找回密码（手机/邮箱 + 验证码重置）
 */

import { z } from 'zod';

/**
 * 账号密码登录
 */
export const loginByPasswordSchema = z.object({
  // 支持邮箱、手机号或用户名
  identifier: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
});
export type LoginByPasswordDto = z.infer<typeof loginByPasswordSchema>;

/**
 * 验证码登录
 */
export const loginByCodeSchema = z.object({
  // 邮箱或手机号
  identifier: z.string().min(1, '请输入手机号或邮箱'),
  code: z.string().length(6, '验证码为6位数字'),
});
export type LoginByCodeDto = z.infer<typeof loginByCodeSchema>;

/**
 * 发送验证码
 */
export const sendCodeSchema = z.object({
  // 邮箱或手机号
  target: z.string().min(1, '请输入手机号或邮箱'),
  // 用途：login 登录 / reset_password 重置密码 / register 自助注册
  purpose: z.enum(['login', 'reset_password', 'register']),
});
export type SendCodeDto = z.infer<typeof sendCodeSchema>;

/**
 * 自助注册 (PRD 6.1.2 A3)
 * 可配置：是否开放普通合伙人自助注册
 * 注意：验证码功能暂时禁用，code 字段设为可选
 */
export const selfRegisterSchema = z.object({
  name: z.string().min(1, '请输入姓名').max(50, '姓名过长'),
  // 邮箱或手机号
  identifier: z.string().min(1, '请输入手机号或邮箱'),
  // 验证码（暂时禁用，设为可选）
  code: z.string().optional(),
  // 邀请码
  inviteCode: z.string().optional(),
  // 性别
  gender: z.string().optional(),
  // 所属组织
  organization: z.string().optional(),
  // 合伙人级别（可选，默认为普通合伙人）
  roleLevel: z.enum(['FOUNDER', 'CORE_PARTNER', 'PARTNER']).optional(),
  // 密码
  password: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字')
    .regex(/[^a-zA-Z0-9]/, '密码需包含特殊字符'),
});
export type SelfRegisterDto = z.infer<typeof selfRegisterSchema>;

/**
 * 重置密码
 */
export const resetPasswordSchema = z.object({
  // 邮箱或手机号
  identifier: z.string().min(1, '请输入手机号或邮箱'),
  code: z.string().length(6, '验证码为6位数字'),
  newPassword: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字')
    .regex(/[^a-zA-Z0-9]/, '密码需包含特殊字符'),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

/**
 * 首次登录设置密码 (PRD 8.3)
 */
export const setInitialPasswordSchema = z.object({
  password: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字')
    .regex(/[^a-zA-Z0-9]/, '密码需包含特殊字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
});
export type SetInitialPasswordDto = z.infer<typeof setInitialPasswordSchema>;

/**
 * 修改密码
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字')
    .regex(/[^a-zA-Z0-9]/, '密码需包含特殊字符'),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    roleLevel: string;
    isAdmin: boolean;
    needSetPassword: boolean; // 是否需要首次设置密码
  };
}

/**
 * 验证码类型
 */
export type VerificationCodePurpose = 'login' | 'reset_password' | 'register';

/**
 * 验证码记录（存储结构）
 */
export interface VerificationCodeRecord {
  code: string;
  purpose: VerificationCodePurpose;
  target: string; // 邮箱或手机号
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

