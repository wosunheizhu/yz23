/**
 * 场地预约 API 客户端 - Node 5
 * PRD 23.3: VenueBooking（场地预约）API
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'FINISHED';
export type MealType = 'LUNCH' | 'DINNER';
export type VisibilityScopeType = 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM';

export interface CreateBookingInput {
  venueId: string;
  title: string;
  purpose?: string;
  startTime: string;
  endTime: string;
  ownerUserId?: string; // 管理员代订
  // PRD 19.5.2: 同行内部人员
  companionUserIds?: string[];
  note?: string;
  visibilityScopeType?: VisibilityScopeType;
  visibilityMinRoleLevel?: number;
  visibilityUserIds?: string[];
  mealIncluded?: boolean;
  mealTypes?: MealType[];
  lunchStart?: string;
  lunchEnd?: string;
  dinnerStart?: string;
  dinnerEnd?: string;
}

export interface UpdateBookingInput {
  title?: string;
  purpose?: string | null;
  startTime?: string;
  endTime?: string;
  companionUserIds?: string[];
  note?: string | null;
  visibilityScopeType?: VisibilityScopeType;
  visibilityMinRoleLevel?: number | null;
  visibilityUserIds?: string[];
  mealIncluded?: boolean;
  mealTypes?: MealType[];
  lunchStart?: string | null;
  lunchEnd?: string | null;
  dinnerStart?: string | null;
  dinnerEnd?: string | null;
}

export interface CancelBookingInput {
  reason?: string;
}

export interface AdminOverrideInput {
  action: 'CANCEL_ORIGINAL' | 'RESCHEDULE_ORIGINAL' | 'FORCE_INSERT';
  reason: string;
  payload?: {
    newStartTime?: string;
    newEndTime?: string;
  };
}

export interface ListBookingsQuery {
  venueId?: string;
  from?: string;
  to?: string;
  owner?: 'me' | 'all';
  status?: BookingStatus;
  mealIncluded?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CheckConflictInput {
  venueId: string;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;
}

export interface BookingResponse {
  id: string;
  venue: {
    id: string;
    name: string;
    address: string | null;
  };
  title: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
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
  lunchStart: string | null;
  lunchEnd: string | null;
  dinnerStart: string | null;
  dinnerEnd: string | null;
  status: BookingStatus;
  adminOverrideFlag: boolean;
  adminOverrideNote: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
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
    startTime: string;
    endTime: string;
    ownerName: string;
  }>;
  // PRD: 冲突则拒绝并提示可选时间
  suggestedSlots?: Array<{
    startTime: string;
    endTime: string;
  }>;
}

// ================================
// API 函数
// ================================

/**
 * 获取预约列表
 */
export const listBookings = async (query?: ListBookingsQuery): Promise<BookingListResponse> => {
  const params = new URLSearchParams();
  if (query?.venueId) params.append('venueId', query.venueId);
  if (query?.from) params.append('from', query.from);
  if (query?.to) params.append('to', query.to);
  if (query?.owner) params.append('owner', query.owner);
  if (query?.status) params.append('status', query.status);
  if (query?.mealIncluded !== undefined) params.append('mealIncluded', String(query.mealIncluded));
  if (query?.page) params.append('page', String(query.page));
  if (query?.pageSize) params.append('pageSize', String(query.pageSize));

  const response = await apiClient.get<BookingListResponse>(`/bookings?${params.toString()}`);
  return response.data;
};

/**
 * 获取预约详情
 */
export const getBookingById = async (bookingId: string): Promise<BookingResponse> => {
  const response = await apiClient.get<BookingResponse>(`/bookings/${bookingId}`);
  return response.data;
};

/**
 * 创建预约
 */
export const createBooking = async (input: CreateBookingInput): Promise<BookingResponse> => {
  const response = await apiClient.post<BookingResponse>('/bookings', input);
  return response.data;
};

/**
 * 更新预约
 */
export const updateBooking = async (
  bookingId: string,
  input: UpdateBookingInput
): Promise<BookingResponse> => {
  const response = await apiClient.patch<{ success: boolean; data: BookingResponse }>(`/bookings/${bookingId}`, input);
  return response.data.data;
};

/**
 * 取消预约
 */
export const cancelBooking = async (
  bookingId: string,
  input?: CancelBookingInput
): Promise<BookingResponse> => {
  const response = await apiClient.post<{ success: boolean; data: BookingResponse }>(`/bookings/${bookingId}/cancel`, input || {});
  return response.data.data;
};

/**
 * 完成预约
 */
export const finishBooking = async (bookingId: string): Promise<BookingResponse> => {
  const response = await apiClient.post<BookingResponse>(`/bookings/${bookingId}/finish`);
  return response.data;
};

/**
 * 检查时间冲突
 */
export const checkConflict = async (input: CheckConflictInput): Promise<ConflictResult> => {
  const response = await apiClient.post<ConflictResult>('/bookings/check-conflict', input);
  return response.data;
};

/**
 * 管理员强制覆盖（仅管理员）
 */
export const adminOverride = async (
  bookingId: string,
  input: AdminOverrideInput
): Promise<BookingResponse> => {
  const response = await apiClient.post<BookingResponse>(`/bookings/${bookingId}/override`, input);
  return response.data;
};

// ================================
// 状态标签
// ================================

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: '已确认',
  CANCELLED: '已取消',
  FINISHED: '已完成',
};

export const getBookingStatusLabel = (status: string): string => {
  return BOOKING_STATUS_LABELS[status as BookingStatus] || status;
};

// ================================
// 对象式 API（统一风格）
// ================================

export const bookingsApi = {
  listBookings,
  getBooking: getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  finishBooking,
  checkConflict,
  adminOverride,
};

// 类型别名（兼容旧代码）
export type Booking = BookingResponse;

