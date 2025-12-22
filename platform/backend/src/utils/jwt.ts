/**
 * JWT 工具
 * 元征 · 合伙人赋能平台
 */

import jwt, { SignOptions, JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { config } from '../config/index.js';

// Token 载荷类型
export interface TokenPayload {
  userId: string;
  email?: string;
  phone?: string;
  roleLevel: string;
  isAdmin: boolean;
}

// 完整的解码后载荷
export interface DecodedToken extends TokenPayload, JwtPayload {}

// Token 验证结果
export interface VerifyTokenResult {
  valid: boolean;
  payload?: DecodedToken;
  error?: string;
}

/**
 * 生成 JWT Token
 */
export const generateToken = (
  payload: TokenPayload,
  expiresIn?: string
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn || config.jwt.expiresIn,
    issuer: 'yuanzheng-platform',
    audience: 'yuanzheng-users',
  };
  
  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * 验证并解码 JWT Token（返回结果对象）
 */
export const verifyToken = (token: string): VerifyTokenResult => {
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: 'yuanzheng-platform',
      audience: 'yuanzheng-users',
    }) as DecodedToken;
    
    return { valid: true, payload };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return { valid: false, error: 'Token 已过期' };
    }
    if (error instanceof JsonWebTokenError) {
      return { valid: false, error: 'Token 无效' };
    }
    return { valid: false, error: '验证失败' };
  }
};

/**
 * 验证并解码 JWT Token（抛出异常版本）
 */
export const verifyTokenOrThrow = (token: string): DecodedToken => {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'yuanzheng-platform',
    audience: 'yuanzheng-users',
  }) as DecodedToken;
};

/**
 * 解码 Token（不验证）
 */
export const decodeToken = (token: string): DecodedToken | null => {
  return jwt.decode(token) as DecodedToken | null;
};

/**
 * 从 Authorization 头提取 Token
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

