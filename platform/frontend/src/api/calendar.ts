/**
 * 日历聚合 API 客户端 - Node 5
 * PRD 23.2: 日历聚合 API
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type CalendarEventType = 'BOOKING' | 'MEETING';

export interface ListCalendarEventsQuery {
  from: string;
  to: string;
  venueId?: string;
  types?: CalendarEventType[];
  page?: number;
  pageSize?: number;
}

export interface BookingMeta {
  mealIncluded: boolean;
  mealTypes: string[];
  lunchStart: string | null;
  lunchEnd: string | null;
  dinnerStart: string | null;
  dinnerEnd: string | null;
  ownerUserId: string;
  ownerName: string;
  purpose: string | null;
}

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

export interface CalendarEventResponse {
  id: string;
  eventType: CalendarEventType;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  location: string | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  canViewDetails: boolean;
  meta: BookingMeta | MeetingMeta | null;
  createdAt: string;
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

export interface CalendarDaySummary {
  date: string;
  bookingCount: number;
  meetingCount: number;
  hasConflict: boolean;
}

export interface CalendarMonthSummaryResponse {
  year: number;
  month: number;
  days: CalendarDaySummary[];
}

// ================================
// API 函数
// ================================

/**
 * 获取日历事件列表
 */
export const listCalendarEvents = async (
  query: ListCalendarEventsQuery
): Promise<CalendarEventsResponse> => {
  const params = new URLSearchParams();
  params.append('from', query.from);
  params.append('to', query.to);
  if (query.venueId) params.append('venueId', query.venueId);
  if (query.types && query.types.length > 0) params.append('types', query.types.join(','));
  if (query.page) params.append('page', String(query.page));
  if (query.pageSize) params.append('pageSize', String(query.pageSize));

  const response = await apiClient.get<CalendarEventsResponse>(`/calendar/events?${params.toString()}`);
  return response.data;
};

/**
 * 获取月份摘要
 */
export const getMonthSummary = async (
  year: number,
  month: number,
  venueId?: string
): Promise<CalendarMonthSummaryResponse> => {
  const params = new URLSearchParams();
  params.append('year', String(year));
  params.append('month', String(month));
  if (venueId) params.append('venueId', venueId);

  const response = await apiClient.get<CalendarMonthSummaryResponse>(
    `/calendar/month-summary?${params.toString()}`
  );
  return response.data;
};

/**
 * 获取即将到来的事件
 */
export const getUpcomingEvents = async (
  days: number = 7
): Promise<{ data: CalendarEventResponse[] }> => {
  const response = await apiClient.get<{ data: CalendarEventResponse[] }>(
    `/calendar/upcoming?days=${days}`
  );
  return response.data;
};

/**
 * 获取我的事件
 */
export const getMyEvents = async (
  from?: string,
  to?: string
): Promise<{ data: CalendarEventResponse[] }> => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await apiClient.get<{ data: CalendarEventResponse[] }>(
    `/calendar/my-events?${params.toString()}`
  );
  return response.data;
};

// ================================
// 对象式 API（统一风格）
// ================================

export const calendarApi = {
  listEvents: listCalendarEvents,
  getMonthSummary,
  getUpcomingEvents,
  getMyEvents,
};

// 类型别名（兼容旧代码）
export type CalendarEvent = CalendarEventResponse;

