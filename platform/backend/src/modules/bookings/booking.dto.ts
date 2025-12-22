/**
 * 场地预约 DTO - Node 5
 * PRD 19.5: 场地预约 VenueBooking
 */

import { z } from 'zod';

// 可见性类型 Schema
const VisibilityScopeTypeSchema = z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']);

// ================================
// 枚举
// ================================

export const BookingStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  FINISHED: 'FINISHED',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const MealType = {
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
} as const;

export type MealType = (typeof MealType)[keyof typeof MealType];

// ================================
// 创建预约 Schema
// PRD 19.5.2: 预约表单字段
// ================================

// 宽松的 datetime 验证辅助函数
const datetimeString = () => z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的时间格式' });

export const CreateBookingSchema = z
  .object({
    venueId: z.string().min(1, '场地ID不能为空'),
    title: z.string().min(1, '标题不能为空').max(100),
    purpose: z.string().max(1000).optional(),
    startTime: datetimeString(),
    endTime: datetimeString(),
    ownerUserId: z.string().optional(), // 管理员可代订

    // PRD 19.5.2: 同行内部人员（可选：合伙人多选，用于通知/共享）
    companionUserIds: z.array(z.string()).optional(),

    // 备注
    note: z.string().max(500).optional(),

    // 可见性
    visibilityScopeType: VisibilityScopeTypeSchema.default('ALL'),
    visibilityMinRoleLevel: z.number().int().min(1).max(3).optional(),
    visibilityUserIds: z.array(z.string()).optional(),

    // 餐食信息 PRD 19.5.2
    mealIncluded: z.boolean().default(false),
    mealTypes: z.array(z.enum(['LUNCH', 'DINNER'])).optional(),
    lunchStart: datetimeString().optional(),
    lunchEnd: datetimeString().optional(),
    dinnerStart: datetimeString().optional(),
    dinnerEnd: datetimeString().optional(),
  })
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: '结束时间必须晚于开始时间' }
  )
  .refine(
    (data) => {
      // PRD 19.5.6: 勾选餐食但缺少用餐时间 → 不能提交
      if (data.mealIncluded && data.mealTypes && data.mealTypes.length > 0) {
        if (
          data.mealTypes.includes('LUNCH') &&
          (!data.lunchStart || !data.lunchEnd)
        ) {
          return false;
        }
        if (
          data.mealTypes.includes('DINNER') &&
          (!data.dinnerStart || !data.dinnerEnd)
        ) {
          return false;
        }
      }
      return true;
    },
    { message: '勾选餐食时必须填写对应的用餐时间' }
  );

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// ================================
// 更新预约 Schema
// ================================

export const UpdateBookingSchema = z
  .object({
    // 场地ID（可选，允许更换场地）
    venueId: z.string().optional(),
    title: z.string().min(1).max(100).optional(),
    purpose: z.string().max(1000).optional().nullable(),
    // 使用宽松的 datetime 验证，接受 ISO 8601 格式
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的开始时间格式' }).optional(),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的结束时间格式' }).optional(),

    // PRD 19.5.2: 同行内部人员
    companionUserIds: z.array(z.string()).optional(),

    // 备注
    note: z.string().max(500).optional().nullable(),

    // 可见性
    visibilityScopeType: VisibilityScopeTypeSchema.optional(),
    visibilityMinRoleLevel: z.number().int().min(1).max(3).optional().nullable(),
    visibilityUserIds: z.array(z.string()).optional(),

    // 餐食信息
    mealIncluded: z.boolean().optional(),
    mealTypes: z.array(z.enum(['LUNCH', 'DINNER'])).optional(),
    lunchStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的午餐开始时间格式' }).optional().nullable(),
    lunchEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的午餐结束时间格式' }).optional().nullable(),
    dinnerStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的晚餐开始时间格式' }).optional().nullable(),
    dinnerEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: '无效的晚餐结束时间格式' }).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
      }
      return true;
    },
    { message: '结束时间必须晚于开始时间' }
  );

export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;

// ================================
// 取消预约 Schema
// ================================

export const CancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;

// ================================
// 管理员覆盖 Schema
// PRD 19.7.5: 管理员强制覆盖（Override）
// ================================

export const AdminOverrideSchema = z.object({
  action: z.enum(['CANCEL_ORIGINAL', 'RESCHEDULE_ORIGINAL', 'FORCE_INSERT']),
  reason: z.string().min(1, '必须填写覆盖原因').max(500),
  payload: z
    .object({
      newStartTime: z.string().datetime().optional(),
      newEndTime: z.string().datetime().optional(),
    })
    .optional(),
});

export type AdminOverrideInput = z.infer<typeof AdminOverrideSchema>;

// ================================
// 查询参数 Schema
// ================================

export const ListBookingsQuerySchema = z.object({
  venueId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  owner: z.enum(['me', 'all']).optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'FINISHED']).optional(),
  mealIncluded: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('20'),
});

export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>;

// ================================
// 冲突检测 Schema
// ================================

export const CheckConflictSchema = z.object({
  venueId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  excludeBookingId: z.string().optional(),
});

export type CheckConflictInput = z.infer<typeof CheckConflictSchema>;

// ================================
// 响应类型
// ================================

export interface BookingResponse {
  id: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  };
  title: string;
  purpose: string | null;
  startTime: Date;
  endTime: Date;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
  // PRD 19.5.2: 同行内部人员
  companions: Array<{
    id: string;
    name: string;
    avatar: string | null;
  }>;
  note: string | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  mealIncluded: boolean;
  mealTypes: MealType[];
  lunchStart: Date | null;
  lunchEnd: Date | null;
  dinnerStart: Date | null;
  dinnerEnd: Date | null;
  status: BookingStatus;
  adminOverrideFlag: boolean;
  adminOverrideNote: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingListResponse {
  data: BookingResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    id: string;
    eventType: 'BOOKING' | 'MEETING';
    title: string;
    startTime: Date;
    endTime: Date;
    ownerName: string;
  }>;
  // PRD: 冲突则拒绝并提示可选时间
  suggestedSlots?: Array<{
    startTime: Date;
    endTime: Date;
  }>;
}

