/**
 * 用户模块 DTO
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.3: 管理员创建账号
 * PRD 8.4: 个人信息表单
 * PRD 8.5: 合伙人名录
 */

import { z } from 'zod';
import { paginationSchema, sortSchema, visibilitySchema, roleLevelSchema } from '../../utils/validation.js';

/**
 * 创建用户（管理员）(PRD 8.3)
 */
export const createUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名过长'),
  roleLevel: roleLevelSchema,
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  password: z.string().min(6, '密码至少6位').max(50, '密码过长').optional(),
  joinedAt: z.string().datetime().or(z.date()).optional(),
  // 可选字段
  gender: z.enum(['男', '女', '其他']).optional(),
  organization: z.string().max(100).optional(),
  isAdmin: z.boolean().optional().default(false),
}).refine((data) => data.email || data.phone, {
  message: '邮箱和手机号至少填写一个',
  path: ['email'],
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

/**
 * 更新用户资料 (PRD 8.4)
 * PRD 6.1.3 B3: 出生日期合理（不可晚于当前日期）
 */
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  gender: z.enum(['男', '女', '其他']).optional(),
  birthDate: z.string().datetime().or(z.date()).optional().nullable()
    .refine((date) => {
      if (!date) return true;
      const birthDate = typeof date === 'string' ? new Date(date) : date;
      return birthDate <= new Date();
    }, { message: '出生日期不能晚于当前日期' }),
  selfDescription: z.string().max(500).optional(),
  expertiseAreas: z.array(z.string()).optional(),
  organization: z.string().max(100).optional(),
  organizationPublic: z.boolean().optional(),
  contactInfo: z.string().max(200).optional(),
  contactInfoPublic: z.boolean().optional(),
  address: z.string().max(200).optional(),
  addressPublic: z.boolean().optional(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().optional(),
    major: z.string().optional(),
    year: z.number().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  hobbies: z.array(z.string()).optional(),
  signature: z.string().max(200).optional(),
  avatar: z.string().url().optional().nullable(),
});
export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;

/**
 * 管理员更新用户
 */
export const adminUpdateUserSchema = z.object({
  roleLevel: roleLevelSchema.optional(),
  isAdmin: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});
export type AdminUpdateUserDto = z.infer<typeof adminUpdateUserSchema>;

/**
 * 用户列表查询参数 (PRD 8.5)
 */
export const listUsersQuerySchema = z.object({
  // 搜索
  search: z.string().optional(), // 姓名/机构/关键词
  // 筛选
  roleLevel: roleLevelSchema.optional(),
  expertiseArea: z.string().optional(),
  tag: z.string().optional(),
  isAdmin: z.coerce.boolean().optional(),
}).merge(paginationSchema).merge(sortSchema);
export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;

/**
 * 本地标签/备注 (PRD 8.5)
 */
export const userNoteSchema = z.object({
  targetUserId: z.string().cuid(),
  note: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});
export type UserNoteDto = z.infer<typeof userNoteSchema>;

/**
 * 用户列表项
 */
export interface UserListItem {
  id: string;
  name: string;
  roleLevel: string;
  isAdmin: boolean;
  avatar: string | null;
  selfDescription: string | null;
  expertiseAreas: string[];
  organization: string | null;
  tags: string[];
  joinedAt: Date;
  tokenBalance: number;
}

/**
 * 用户贡献统计（PRD 6.1.4 C2）
 */
export interface UserContributionStats {
  projectCount: number;        // 参与项目数
  resourceCount: number;       // 提供资源次数
  guestInviteCount: number;    // 邀请会议嘉宾次数
  networkResourceCount: number; // 人脉资源数
}

/**
 * 用户详情
 */
export interface UserDetail extends UserListItem {
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: Date | null;
  contactInfo: string | null;
  address: string | null;
  education: any[];
  hobbies: string[];
  signature: string | null;
  // 公开控制
  organizationPublic: boolean;
  contactInfoPublic: boolean;
  addressPublic: boolean;
  // Token 账户
  tokenBalance?: number;
  // 贡献统计（PRD 6.1.4 C2）
  stats?: UserContributionStats;
}

/**
 * 用户统计
 */
export interface UserStats {
  totalUsers: number;
  byRoleLevel: {
    FOUNDER: number;
    CORE_PARTNER: number;
    PARTNER: number;
  };
  adminCount: number;
}

