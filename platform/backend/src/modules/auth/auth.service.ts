/**
 * 认证服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.2: 登录与找回密码
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { 
  UnauthorizedError, 
  BadRequestError, 
  NotFoundError,
  TooManyRequestsError,
  ErrorCodes 
} from '../../utils/errors.js';
import { generateToken } from '../../utils/jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { 
  checkVerificationCodeRateLimit, 
  checkLoginRateLimit,
  resetRateLimit 
} from '../../utils/rateLimit.js';
import { generateVerificationCode, maskSensitiveData } from '../../utils/security.js';
import { sendVerificationCodeEmail } from '../../utils/email.js';
import { createAuditLog, extractClientInfo } from '../../utils/audit.js';
import type { Request } from 'express';
import { getSystemConfig } from '../../utils/systemConfig.js';
import type {
  LoginByPasswordDto,
  LoginByCodeDto,
  SendCodeDto,
  ResetPasswordDto,
  SetInitialPasswordDto,
  ChangePasswordDto,
  SelfRegisterDto,
  LoginResponse,
  VerificationCodeRecord,
  VerificationCodePurpose,
} from './auth.dto.js';

/**
 * 内存验证码存储（生产环境应使用 Redis）
 */
const verificationCodes = new Map<string, VerificationCodeRecord>();

/**
 * 验证码有效期（秒）
 */
const CODE_TTL_SECONDS = 600; // 10分钟

/**
 * 判断是邮箱还是手机号
 */
const isEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

/**
 * 根据标识符查找用户
 * 同时支持邮箱和手机号查找
 */
const findUserByIdentifier = async (identifier: string) => {
  return prisma.user.findFirst({
    where: {
      isDeleted: false,
      OR: [
        { email: identifier },
        { phone: identifier },
      ],
    },
    include: {
      tokenAccount: {
        select: { balance: true },
      },
    },
  });
};

/**
 * 生成登录响应
 */
const buildLoginResponse = (user: any): LoginResponse => {
  const token = generateToken({
    userId: user.id,
    roleLevel: user.roleLevel,
    isAdmin: user.isAdmin,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      roleLevel: user.roleLevel,
      isAdmin: user.isAdmin,
      needSetPassword: !user.passwordHash, // 没有密码则需要首次设置
    },
  };
};

/**
 * 密码登录
 */
export const loginByPassword = async (
  dto: LoginByPasswordDto,
  req?: Request
): Promise<LoginResponse> => {
  const { identifier, password } = dto;
  
  // 检查是否是超级管理员登录（不依赖数据库）
  const { config } = await import('../../config/index.js');
  if (config.superAdmin.enabled) {
    const isSuperAdmin = identifier === config.superAdmin.identifier && 
                         password === config.superAdmin.password;
    if (isSuperAdmin) {
      logger.info({ identifier }, '超级管理员登录成功');
      
      // 返回超级管理员的虚拟用户信息
      const token = generateToken({
        userId: 'super-admin',
        roleLevel: 'FOUNDER',
        isAdmin: true,
      });
      
      return {
        token,
        user: {
          id: 'super-admin',
          email: config.superAdmin.identifier.includes('@') ? config.superAdmin.identifier : null,
          phone: !config.superAdmin.identifier.includes('@') ? config.superAdmin.identifier : null,
          name: config.superAdmin.name,
          roleLevel: 'FOUNDER',
          isAdmin: true,
          needSetPassword: false,
        },
      };
    }
  }
  
  // 检查登录频控 (PRD 8.2)
  const rateLimitResult = checkLoginRateLimit(identifier);
  if (!rateLimitResult.allowed) {
    throw new TooManyRequestsError(
      ErrorCodes.TOO_MANY_REQUESTS,
      `登录尝试过于频繁，请${rateLimitResult.retryAfterSeconds}秒后重试`
    );
  }

  // 查找用户
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    logger.warn({ identifier: maskSensitiveData.email(identifier) }, '登录失败：用户不存在');
    throw new UnauthorizedError(ErrorCodes.INVALID_CREDENTIALS, '账号或密码错误');
  }

  // 检查是否有密码
  if (!user.passwordHash) {
    throw new BadRequestError(
      ErrorCodes.PASSWORD_NOT_SET,
      '账号尚未设置密码，请使用验证码登录后设置密码'
    );
  }

  // 验证密码
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    logger.warn({ userId: user.id }, '登录失败：密码错误');
    throw new UnauthorizedError(ErrorCodes.INVALID_CREDENTIALS, '账号或密码错误');
  }

  // 登录成功，重置频控计数
  resetRateLimit(identifier, 'login:');

  // 记录审计日志
  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    objectType: 'USER',
    objectId: user.id,
    summary: '用户登录',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId: user.id }, '用户登录成功');
  
  return buildLoginResponse(user);
};

/**
 * 验证码登录
 */
export const loginByCode = async (
  dto: LoginByCodeDto,
  req?: Request
): Promise<LoginResponse> => {
  const { identifier, code } = dto;

  // 验证验证码
  const codeKey = `${identifier}:login`;
  const record = verificationCodes.get(codeKey);

  if (!record) {
    throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码无效或已过期');
  }

  if (record.used) {
    throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码已使用');
  }

  if (new Date() > record.expiresAt) {
    verificationCodes.delete(codeKey);
    throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码已过期');
  }

  if (record.code !== code) {
    throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码错误');
  }

  // 标记验证码已使用
  record.used = true;

  // 查找用户
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  // 记录审计日志
  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    objectType: 'USER',
    objectId: user.id,
    summary: '用户验证码登录',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId: user.id }, '用户验证码登录成功');

  return buildLoginResponse(user);
};

/**
 * 发送验证码
 */
export const sendVerificationCode = async (
  dto: SendCodeDto
): Promise<{ message: string; expiresIn: number }> => {
  const { target, purpose } = dto;

  // 检查频控 (PRD 8.2: 60秒)
  const rateLimitResult = checkVerificationCodeRateLimit(target);
  if (!rateLimitResult.allowed) {
    throw new TooManyRequestsError(
      ErrorCodes.TOO_MANY_REQUESTS,
      `请${rateLimitResult.retryAfterSeconds}秒后再试`
    );
  }

  // 检查用户是否存在
  const user = await findUserByIdentifier(target);
  
  if (purpose === 'reset_password' && !user) {
    // 重置密码时用户必须存在
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '该账号不存在');
  }

  if (purpose === 'login' && !user) {
    // 登录时用户必须存在
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '该账号不存在');
  }

  // 生成验证码
  const code = generateVerificationCode(6);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_SECONDS * 1000);

  // 存储验证码
  const codeKey = `${target}:${purpose}`;
  verificationCodes.set(codeKey, {
    code,
    purpose,
    target,
    createdAt: now,
    expiresAt,
    used: false,
  });

  // 发送验证码
  if (isEmail(target)) {
    await sendVerificationCodeEmail(target, code, purpose);
  } else {
    // TODO: 实现短信发送
    logger.info({ phone: maskSensitiveData.phone(target), code }, '验证码（开发模式）');
  }

  logger.info({ 
    target: isEmail(target) ? maskSensitiveData.email(target) : maskSensitiveData.phone(target),
    purpose,
  }, '验证码已发送');

  return {
    message: '验证码已发送',
    expiresIn: CODE_TTL_SECONDS,
  };
};

/**
 * 重置密码
 */
export const resetPassword = async (
  dto: ResetPasswordDto,
  req?: Request
): Promise<{ message: string }> => {
  const { identifier, code, newPassword } = dto;

  // 验证验证码
  const codeKey = `${identifier}:reset_password`;
  const record = verificationCodes.get(codeKey);

  if (!record || record.used || new Date() > record.expiresAt || record.code !== code) {
    throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码无效或已过期');
  }

  // 查找用户
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  // 更新密码
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // 标记验证码已使用
  record.used = true;

  // 记录审计日志
  await createAuditLog({
    userId: user.id,
    action: 'PASSWORD_RESET',
    objectType: 'USER',
    objectId: user.id,
    summary: '用户重置密码',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId: user.id }, '用户重置密码成功');

  return { message: '密码重置成功' };
};

/**
 * 首次设置密码 (PRD 8.3)
 */
export const setInitialPassword = async (
  userId: string,
  dto: SetInitialPasswordDto,
  req?: Request
): Promise<{ message: string }> => {
  const { password } = dto;

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  // 检查是否已设置密码
  if (user.passwordHash) {
    throw new BadRequestError(ErrorCodes.PASSWORD_ALREADY_SET, '密码已设置，请使用修改密码功能');
  }

  // 设置密码
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // 记录审计日志
  await createAuditLog({
    userId,
    action: 'CREATE',
    objectType: 'USER',
    objectId: userId,
    summary: '用户首次设置密码',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId }, '用户首次设置密码成功');

  return { message: '密码设置成功' };
};

/**
 * 修改密码
 */
export const changePassword = async (
  userId: string,
  dto: ChangePasswordDto,
  req?: Request
): Promise<{ message: string }> => {
  const { currentPassword, newPassword } = dto;

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });

  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  if (!user.passwordHash) {
    throw new BadRequestError(ErrorCodes.PASSWORD_NOT_SET, '请先设置密码');
  }

  // 验证当前密码
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new BadRequestError(ErrorCodes.INVALID_CREDENTIALS, '当前密码错误');
  }

  // 更新密码
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // 记录审计日志
  await createAuditLog({
    userId,
    action: 'UPDATE',
    objectType: 'USER',
    objectId: userId,
    summary: '用户修改密码',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId }, '用户修改密码成功');

  return { message: '密码修改成功' };
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: {
      tokenAccount: {
        select: { balance: true, initialAmount: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '用户不存在');
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    gender: user.gender,
    roleLevel: user.roleLevel,
    isAdmin: user.isAdmin,
    joinedAt: user.joinedAt,
    selfDescription: user.selfDescription,
    expertiseAreas: user.expertiseAreas,
    organization: user.organization,
    organizationPublic: user.organizationPublic,
    tags: user.tags,
    avatar: user.avatar,
    tokenBalance: user.tokenAccount?.balance ?? 0,
    needSetPassword: !user.passwordHash,
  };
};

/**
 * 登出（记录审计）
 */
export const logout = async (userId: string, req?: Request): Promise<void> => {
  await createAuditLog({
    userId,
    action: 'LOGOUT',
    objectType: 'USER',
    objectId: userId,
    summary: '用户登出',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId }, '用户登出');
};

/**
 * 自助注册 (PRD 6.1.2 A3)
 * 需要系统配置 ALLOW_SELF_REGISTRATION 开启
 * 注意：验证码功能暂时禁用，使用邀请码验证
 */
export const selfRegister = async (
  dto: SelfRegisterDto,
  req?: Request
): Promise<LoginResponse> => {
  const { name, identifier, password, inviteCode, gender, organization, roleLevel: requestedRole } = dto;

  // 验证邀请码（替代验证码）
  const systemConfig = getSystemConfig();
  const VALID_INVITE_CODE = systemConfig.selfRegistrationInviteCode || 'yuanzheng1223';
  
  logger.info({ 
    providedCode: inviteCode, 
    expectedCode: VALID_INVITE_CODE,
    configInviteCode: systemConfig.selfRegistrationInviteCode,
  }, '验证邀请码');
  
  if (inviteCode !== VALID_INVITE_CODE) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, `邀请码不正确（期望: ${VALID_INVITE_CODE.substring(0, 2)}***）`);
  }

  // 验证码功能暂时禁用，跳过验证码检查
  // 原代码:
  // const codeRecord = verificationCodes.get(identifier);
  // if (!codeRecord || codeRecord.code !== code) {
  //   throw new BadRequestError(ErrorCodes.INVALID_VERIFICATION_CODE, '验证码错误');
  // }
  // ... 其他验证码验证逻辑

  // 检查是否已存在
  const isEmailAddr = isEmail(identifier);
  const existingUser = await prisma.user.findFirst({
    where: {
      isDeleted: false,
      OR: [
        isEmailAddr ? { email: identifier } : { phone: identifier },
      ],
    },
  });

  if (existingUser) {
    throw new BadRequestError(
      ErrorCodes.VALIDATION_ERROR,
      isEmailAddr ? '该邮箱已注册' : '该手机号已注册'
    );
  }

  // 用户可以选择合伙人级别，默认为普通合伙人
  const roleLevel = requestedRole || 'PARTNER';
  
  // 根据级别设置初始Token额度
  const initialAmounts: Record<string, number> = {
    'FOUNDER': 100000,       // 联合创始人
    'CORE_PARTNER': 30000,   // 核心合伙人
    'PARTNER': 10000,        // 普通合伙人
  };
  const initialAmount = initialAmounts[roleLevel] || 10000;

  // 创建用户
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email: isEmailAddr ? identifier : null,
        phone: !isEmailAddr ? identifier : null,
        roleLevel,
        passwordHash,
        joinedAt: new Date(),
        isAdmin: false,
        gender: gender || null,
        organization: organization || null,
        tokenAccount: {
          create: { initialAmount, balance: initialAmount },
        },
      },
      include: {
        tokenAccount: {
          select: { balance: true },
        },
      },
    });
    return newUser;
  });

  // 记录审计日志
  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    objectType: 'USER',
    objectId: user.id,
    summary: '用户自助注册',
    ...extractClientInfo(req as any),
  });

  logger.info({ userId: user.id, identifier: maskSensitiveData.email(identifier) }, '用户自助注册成功');

  return buildLoginResponse(user);
};

/**
 * 检查是否开放自助注册
 */
export const checkSelfRegistrationEnabled = async (): Promise<boolean> => {
  return await getSystemConfig<boolean>('ALLOW_SELF_REGISTRATION', false);
};

