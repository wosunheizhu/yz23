/**
 * 认证 API
 * 元征 · 合伙人赋能平台
 */

import { post, get } from './client';
import type { User } from '../stores/authStore';

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
}

// 密码登录
export interface LoginByPasswordParams {
  identifier: string;
  password: string;
}

export const loginByPassword = (params: LoginByPasswordParams) =>
  post<LoginResponse>('/auth/login/password', params);

// 验证码登录
export interface LoginByCodeParams {
  identifier: string;
  code: string;
}

export const loginByCode = (params: LoginByCodeParams) =>
  post<LoginResponse>('/auth/login/code', params);

// 发送验证码
export interface SendCodeParams {
  target: string;
  purpose: 'login' | 'reset_password' | 'register';
}

export interface SendCodeResponse {
  message: string;
  expiresIn: number;
}

export const sendVerificationCode = (params: SendCodeParams) =>
  post<SendCodeResponse>('/auth/send-code', params);

// 重置密码
export interface ResetPasswordParams {
  identifier: string;
  code: string;
  newPassword: string;
}

export const resetPassword = (params: ResetPasswordParams) =>
  post<{ message: string }>('/auth/reset-password', params);

// 首次设置密码
export interface SetPasswordParams {
  password: string;
  confirmPassword: string;
}

export const setInitialPassword = (params: SetPasswordParams) =>
  post<{ message: string }>('/auth/set-password', params);

// 修改密码
export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = (params: ChangePasswordParams) =>
  post<{ message: string }>('/auth/change-password', params);

// 获取当前用户
export interface CurrentUserResponse extends User {
  tokenBalance?: number;
  joinedAt?: string;
  selfDescription?: string;
  expertiseAreas?: string[];
  organization?: string;
  tags?: string[];
}

export const getCurrentUser = () =>
  get<CurrentUserResponse>('/auth/me');

// 登出
export const logout = () =>
  post<{ message: string }>('/auth/logout');

// 检查是否开放自助注册 (PRD 6.1.2 A3)
export interface RegistrationStatusResponse {
  selfRegistrationEnabled: boolean;
}

export const checkRegistrationStatus = () =>
  get<RegistrationStatusResponse>('/auth/registration-status');

// 自助注册 (PRD 6.1.2 A3)
export interface SelfRegisterParams {
  name: string;
  identifier: string; // 邮箱或手机号
  code: string;
  password: string;
}

export const selfRegister = (params: SelfRegisterParams) =>
  post<LoginResponse>('/auth/register', params);

