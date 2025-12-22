/**
 * 日历聚合 DTO - Node 5
 * PRD 19.7.1: 统一返回结构 CalendarEvent
 */

import { z } from 'zod';

// ================================
// 日历事件类型
// ================================

export const CalendarEventType = {
  BOOKING: 'BOOKING',
  MEETING: 'MEETING',
} as const;

export type CalendarEventType = (typeof CalendarEventType)[keyof typeof CalendarEventType];

// ================================
// 查询参数 Schema
// PRD 23.2: GET /calendar/events?from=&to=&venue_id=&types=BOOKING,MEETING
// ================================

export const ListCalendarEventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  venueId: z.string().optional(),
  types: z
    .string()
    .transform((v) => v.split(',').filter(Boolean) as CalendarEventType[])
    .optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  pageSize: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('50'),
});

export type ListCalendarEventsQuery = z.infer<typeof ListCalendarEventsQuerySchema>;

// ================================
// 响应类型
// PRD 19.7.1: 统一返回结构
// ================================

/**
 * 预约元数据
 */
export interface BookingMeta {
  mealIncluded: boolean;
  mealTypes: string[];
  lunchStart: Date | null;
  lunchEnd: Date | null;
  dinnerStart: Date | null;
  dinnerEnd: Date | null;
  ownerUserId: string;
  ownerName: string;
  purpose: string | null;
}

/**
 * 会议元数据
 */
export interface MeetingMeta {
  meetingKind: string;
  meetingLevel: string;
  confidentiality: string;
  isOffline: boolean;
  onlineLink: string | null;
  participantCount: number;
  guestCount: number;
  projectId: string | null;
  projectName: string | null;
}

/**
 * 日历事件响应
 * PRD 19.7.1: 前端只消费一种结构
 */
export interface CalendarEventResponse {
  id: string;
  eventType: CalendarEventType;
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  location: string | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  // PRD 19.7.2: 占用层 vs 详情层
  // 如果用户没有详情权限，只返回基本信息
  canViewDetails: boolean;
  meta: BookingMeta | MeetingMeta | null;
  createdAt: Date;
}

export interface CalendarEventsResponse {
  data: CalendarEventResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 日历摘要（月视图）
 */
export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  bookingCount: number;
  meetingCount: number;
  hasConflict: boolean;
}

export interface CalendarMonthSummaryResponse {
  year: number;
  month: number;
  days: CalendarDaySummary[];
}






