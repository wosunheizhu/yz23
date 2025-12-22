/**
 * 公司座谈会 DTO - Node 5
 * PRD 19.6: 公司座谈会 CompanyMeeting
 */

import { z } from 'zod';

// 可见性类型 Schema
const VisibilityScopeTypeSchema = z.enum(['ALL', 'ROLE_MIN_LEVEL', 'CUSTOM']);

// ================================
// 枚举
// ================================

export const MeetingKind = {
  DAILY: 'DAILY',
  COMPANY: 'COMPANY',
} as const;

export const MeetingLevel = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
} as const;

export const ConfidentialityLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const MeetingStatus = {
  SCHEDULED: 'SCHEDULED',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
} as const;

export const ParticipantRole = {
  HOST: 'HOST',
  ATTENDEE: 'ATTENDEE',
  OPTIONAL: 'OPTIONAL',
} as const;

export const AttendanceStatus = {
  INVITED: 'INVITED',
  ATTENDING: 'ATTENDING',
  DECLINED: 'DECLINED',
  NO_SHOW: 'NO_SHOW',
} as const;

export const GuestCategory = {
  PUBLIC_CO_DMHG: 'PUBLIC_CO_DMHG',
  FIN_EXEC: 'FIN_EXEC',
  PUBLIC_CHAIRMAN_CONTROLLER: 'PUBLIC_CHAIRMAN_CONTROLLER',
  MINISTRY_LEADER: 'MINISTRY_LEADER',
  BUREAU_LEADER: 'BUREAU_LEADER',  // 厅级领导
  DEPT_LEADER: 'DEPT_LEADER',      // 处级领导
  OTHER: 'OTHER',
} as const;

// 嘉宾类别标签
export const GUEST_CATEGORY_LABELS: Record<string, string> = {
  PUBLIC_CO_DMHG: '上市公司董监高',
  FIN_EXEC: '金融从业高管',
  PUBLIC_CHAIRMAN_CONTROLLER: '董事长/实控人',
  MINISTRY_LEADER: '部委部级领导',
  BUREAU_LEADER: '厅级领导',
  DEPT_LEADER: '处级领导',
  OTHER: '其他',
};

// Token 发放默认档位 PRD 20.3
export const GUEST_GRANT_DEFAULTS: Record<string, number> = {
  PUBLIC_CO_DMHG: 500,
  FIN_EXEC: 500,
  PUBLIC_CHAIRMAN_CONTROLLER: 1000,
  MINISTRY_LEADER: 2000,
  BUREAU_LEADER: 1500,   // 厅级领导
  DEPT_LEADER: 800,      // 处级领导
  OTHER: 0,
};

// ================================
// 创建会议 Schema
// PRD 19.6.2: 会议表单字段
// ================================

export const CreateMeetingSchema = z
  .object({
    topic: z.string().min(1, '会议主题不能为空').max(200),
    meetingKind: z.enum(['DAILY', 'COMPANY']).default('COMPANY'),
    meetingLevel: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
    confidentiality: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    venueId: z.string().optional(),
    location: z.string().max(200).optional(),
    isOffline: z.boolean().default(true),
    onlineLink: z.string().url().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    projectId: z.string().optional(),

    // 可见性
    visibilityScopeType: VisibilityScopeTypeSchema.default('ALL'),
    visibilityMinRoleLevel: z.number().int().min(1).max(3).optional(),
    visibilityUserIds: z.array(z.string()).optional(),

    // 初始参与者
    participants: z
      .array(
        z.object({
          userId: z.string(),
          role: z.enum(['HOST', 'ATTENDEE', 'OPTIONAL']),
        })
      )
      .optional(),
  })
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: '结束时间必须晚于开始时间' }
  )
  .refine(
    (data) => {
      // 线下会议必须有场地或地址
      if (data.isOffline && !data.venueId && !data.location) {
        return false;
      }
      return true;
    },
    { message: '线下会议必须选择场地或填写地址' }
  );

export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;

// ================================
// 更新会议 Schema
// ================================

export const UpdateMeetingSchema = z.object({
  topic: z.string().min(1).max(200).optional(),
  meetingLevel: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  confidentiality: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  venueId: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  isOffline: z.boolean().optional(),
  onlineLink: z.string().url().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  projectId: z.string().optional().nullable(),
  visibilityScopeType: VisibilityScopeTypeSchema.optional(),
  visibilityMinRoleLevel: z.number().int().min(1).max(3).optional().nullable(),
  visibilityUserIds: z.array(z.string()).optional(),
});

export type UpdateMeetingInput = z.infer<typeof UpdateMeetingSchema>;

// ================================
// 参与者 Schema
// ================================

export const AddParticipantSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['HOST', 'ATTENDEE', 'OPTIONAL']).default('ATTENDEE'),
});

export type AddParticipantInput = z.infer<typeof AddParticipantSchema>;

export const UpdateParticipantSchema = z.object({
  role: z.enum(['HOST', 'ATTENDEE', 'OPTIONAL']).optional(),
  attendanceStatus: z.enum(['INVITED', 'ATTENDING', 'DECLINED', 'NO_SHOW']).optional(),
});

export type UpdateParticipantInput = z.infer<typeof UpdateParticipantSchema>;

// ================================
// 外部嘉宾 Schema
// PRD 19.6.2: 外部嘉宾必须有组织/职位/姓名/邀请人
// ================================

export const AddGuestSchema = z.object({
  name: z.string().min(1, '嘉宾姓名不能为空').max(50),
  organization: z.string().min(1, '嘉宾组织不能为空').max(100),
  title: z.string().min(1, '嘉宾职位不能为空').max(100),
  contact: z.string().max(200).optional(), // 敏感字段
  note: z.string().max(500).optional(),
  guestCategory: z.enum([
    'PUBLIC_CO_DMHG',
    'FIN_EXEC',
    'PUBLIC_CHAIRMAN_CONTROLLER',
    'DEPT_LEADER',
    'BUREAU_LEADER',
    'MINISTRY_LEADER',
    'OTHER',
  ]).default('OTHER'),
  invitedByUserId: z.string().optional(), // 管理员可指定邀请人
});

export type AddGuestInput = z.infer<typeof AddGuestSchema>;

export const UpdateGuestSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  organization: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(100).optional(),
  contact: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  guestCategory: z.enum([
    'PUBLIC_CO_DMHG',
    'FIN_EXEC',
    'PUBLIC_CHAIRMAN_CONTROLLER',
    'DEPT_LEADER',
    'BUREAU_LEADER',
    'MINISTRY_LEADER',
    'OTHER',
  ]).optional(),
});

export type UpdateGuestInput = z.infer<typeof UpdateGuestSchema>;

// ================================
// 会议纪要 Schema
// PRD 19.6.4: 会议纪要
// ================================

export const UpdateMinutesSchema = z.object({
  content: z.string().min(1, '纪要内容不能为空'),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.string().optional(),
      })
    )
    .optional(),
});

export type UpdateMinutesInput = z.infer<typeof UpdateMinutesSchema>;

// ================================
// 查询参数 Schema
// ================================

export const ListMeetingsQuerySchema = z.object({
  meetingKind: z.enum(['DAILY', 'COMPANY']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  projectId: z.string().optional(),
  status: z.enum(['SCHEDULED', 'FINISHED', 'CANCELLED']).optional(),
  venueId: z.string().optional(),
  myMeetings: z
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

export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;

// ================================
// 响应类型
// ================================

export interface ParticipantResponse {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  role: string;
  attendanceStatus: string;
}

export interface GuestResponse {
  id: string;
  name: string;
  organization: string;
  title: string;
  contact: string | null; // 仅对管理员/创建者可见
  note: string | null;
  guestCategory: string;
  defaultGrantAmount: number;
  finalGrantAmount: number | null;
  invitedBy: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface MinutesResponse {
  id: string;
  content: string;
  attachments: Array<{
    name: string;
    url: string;
    type?: string;
  }> | null;
  createdAt: Date;
  updatedAt: Date;
}

// PRD 30.1: 嘉宾补录不完整时的返回结构
export interface IncompleteGuestInfo {
  guestId: string;
  guestName: string;
  missingFields: ('invitedBy' | 'organization' | 'title' | 'guestCategory')[];
}

export interface FinishMeetingResponse {
  meeting: MeetingDetailResponse;
  grantTasksCreated: number;
  incompleteGuests: IncompleteGuestInfo[];
}

export interface MeetingResponse {
  id: string;
  topic: string;
  meetingKind: string;
  meetingLevel: string;
  confidentiality: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  location: string | null;
  isOffline: boolean;
  onlineLink: string | null;
  startTime: Date;
  endTime: Date;
  project: {
    id: string;
    name: string;
  } | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  status: string;
  participantCount: number;
  guestCount: number;
  hasMinutes: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingDetailResponse extends MeetingResponse {
  participants: ParticipantResponse[];
  guests: GuestResponse[];
  minutes: MinutesResponse | null;
}

export interface MeetingListResponse {
  data: MeetingResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

