/**
 * 日历聚合 Service - Node 5
 * PRD 19.7: 日历聚合展示与权限
 */

import { prisma } from '../../utils/db.js';
import { applyVisibilityFilter, canUserSeeObject } from '../../utils/visibility.js';
import type {
  ListCalendarEventsQuery,
  CalendarEventResponse,
  CalendarEventsResponse,
  CalendarMonthSummaryResponse,
  CalendarDaySummary,
  BookingMeta,
  MeetingMeta,
} from './calendar.dto.js';

/**
 * 获取日历事件列表
 * PRD 23.2: GET /calendar/events
 */
export const listCalendarEvents = async (
  query: ListCalendarEventsQuery,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<CalendarEventsResponse> => {
  const { from, to, venueId, types, page, pageSize } = query;
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const includeBookings = !types || types.includes('BOOKING');
  const includeMeetings = !types || types.includes('MEETING');

  const events: CalendarEventResponse[] = [];

  // 获取场地预约
  if (includeBookings) {
    const bookingWhere: Record<string, unknown> = {
      isDeleted: false,
      startTime: { gte: fromDate },
      endTime: { lte: toDate },
    };

    if (venueId) {
      bookingWhere.venueId = venueId;
    }

    // 可见性过滤 - VenueBooking 使用 ownerUserId 作为创建者字段
    if (!isAdmin) {
      const visibilityFilter = applyVisibilityFilter(userId, userRoleLevel);
      // 添加 owner 条件：用户是预约所有者也能看到
      bookingWhere.OR = [
        ...(visibilityFilter.OR || []),
        { ownerUserId: userId },
      ];
    }

    const bookings = await prisma.venueBooking.findMany({
      where: bookingWhere as any,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    for (const booking of bookings) {
      const canViewDetails = isAdmin || 
        booking.ownerUserId === userId ||
        canUserSeeObject(
          {
            visibilityScopeType: booking.visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
            visibilityMinRoleLevel: booking.visibilityMinRoleLevel,
            visibilityUserIds: booking.visibilityUserIds,
          },
          userId,
          userRoleLevel
        );

      events.push({
        id: booking.id,
        eventType: 'BOOKING',
        title: canViewDetails ? booking.title : '已占用',
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        venue: booking.venue,
        location: null,
        visibilityScopeType: booking.visibilityScopeType,
        visibilityMinRoleLevel: booking.visibilityMinRoleLevel,
        canViewDetails,
        meta: canViewDetails
          ? ({
              mealIncluded: booking.mealIncluded,
              mealTypes: booking.mealTypes,
              lunchStart: booking.lunchStart,
              lunchEnd: booking.lunchEnd,
              dinnerStart: booking.dinnerStart,
              dinnerEnd: booking.dinnerEnd,
              ownerUserId: booking.ownerUserId,
              ownerName: booking.owner.name,
              purpose: booking.purpose,
            } as BookingMeta)
          : null,
        createdAt: booking.createdAt,
      });
    }
  }

  // 获取公司座谈会
  if (includeMeetings) {
    const meetingWhere: Record<string, unknown> = {
      isDeleted: false,
      startTime: { gte: fromDate },
      endTime: { lte: toDate },
    };

    if (venueId) {
      meetingWhere.venueId = venueId;
    }

    // 可见性过滤 - Meeting 使用 participants 关系判断参与者
    if (!isAdmin) {
      const visibilityFilter = applyVisibilityFilter(userId, userRoleLevel);
      // 添加参与者条件：用户是会议参与者也能看到
      meetingWhere.OR = [
        ...(visibilityFilter.OR || []),
        { participants: { some: { userId } } },
      ];
    }

    const meetings = await prisma.meeting.findMany({
      where: meetingWhere as any,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        project: { select: { id: true, name: true } },
        _count: {
          select: {
            participants: true,
            externalGuests: true,
          },
        },
        participants: {
          select: { userId: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    for (const meeting of meetings) {
      const isParticipant = meeting.participants.some((p) => p.userId === userId);
      const canViewDetails = isAdmin || 
        isParticipant ||
        canUserSeeObject(
          {
            visibilityScopeType: meeting.visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
            visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
            visibilityUserIds: meeting.visibilityUserIds,
          },
          userId,
          userRoleLevel
        );

      events.push({
        id: meeting.id,
        eventType: 'MEETING',
        title: canViewDetails ? meeting.topic : '已占用',
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        venue: meeting.venue,
        location: meeting.location,
        visibilityScopeType: meeting.visibilityScopeType,
        visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
        canViewDetails,
        meta: canViewDetails
          ? ({
              meetingKind: meeting.meetingKind,
              meetingLevel: meeting.meetingLevel,
              confidentiality: meeting.confidentiality,
              isOffline: meeting.isOffline,
              onlineLink: meeting.onlineLink,
              participantCount: meeting._count.participants,
              guestCount: meeting._count.externalGuests,
              projectId: meeting.projectId,
              projectName: meeting.project?.name ?? null,
            } as MeetingMeta)
          : null,
        createdAt: meeting.createdAt,
      });
    }
  }

  // 按开始时间排序
  events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // 分页
  const total = events.length;
  const paginatedEvents = events.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: paginatedEvents,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取月份摘要（用于月视图）
 */
export const getMonthSummary = async (
  year: number,
  month: number,
  venueId: string | undefined,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<CalendarMonthSummaryResponse> => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 获取该月所有事件
  const result = await listCalendarEvents(
    {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      venueId,
      page: 1,
      pageSize: 1000, // 假设一个月内不会超过1000个事件
    },
    userId,
    userRoleLevel,
    isAdmin
  );

  // 按日期分组统计
  const dayMap = new Map<string, CalendarDaySummary>();

  for (const event of result.data) {
    const dateStr = event.startTime.toISOString().split('T')[0];
    
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        date: dateStr,
        bookingCount: 0,
        meetingCount: 0,
        hasConflict: false,
      });
    }

    const day = dayMap.get(dateStr)!;
    if (event.eventType === 'BOOKING') {
      day.bookingCount++;
    } else {
      day.meetingCount++;
    }
  }

  // 检查冲突
  for (const [dateStr, day] of dayMap) {
    const dayEvents = result.data.filter(
      (e) => e.startTime.toISOString().split('T')[0] === dateStr
    );

    // 简单冲突检测：同一天内同一场地有多个事件
    const venueEventMap = new Map<string, number>();
    for (const event of dayEvents) {
      if (event.venue) {
        const count = venueEventMap.get(event.venue.id) || 0;
        venueEventMap.set(event.venue.id, count + 1);
        if (count + 1 > 1) {
          // 需要更精确的时间重叠检测
          day.hasConflict = true;
        }
      }
    }
  }

  return {
    year,
    month,
    days: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

/**
 * 获取今日/本周事件
 */
export const getUpcomingEvents = async (
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean,
  days: number = 7
): Promise<CalendarEventResponse[]> => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const result = await listCalendarEvents(
    {
      from: now.toISOString(),
      to: endDate.toISOString(),
      page: 1,
      pageSize: 20,
    },
    userId,
    userRoleLevel,
    isAdmin
  );

  return result.data;
};

/**
 * 获取我的事件（作为所有者或参与者）
 */
export const getMyEvents = async (
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean,
  from: Date,
  to: Date
): Promise<CalendarEventResponse[]> => {
  const events: CalendarEventResponse[] = [];

  // 我的预约
  const myBookings = await prisma.venueBooking.findMany({
    where: {
      isDeleted: false,
      ownerUserId: userId,
      startTime: { gte: from },
      endTime: { lte: to },
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  for (const booking of myBookings) {
    events.push({
      id: booking.id,
      eventType: 'BOOKING',
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      venue: booking.venue,
      location: null,
      visibilityScopeType: booking.visibilityScopeType,
      visibilityMinRoleLevel: booking.visibilityMinRoleLevel,
      canViewDetails: true,
      meta: {
        mealIncluded: booking.mealIncluded,
        mealTypes: booking.mealTypes,
        lunchStart: booking.lunchStart,
        lunchEnd: booking.lunchEnd,
        dinnerStart: booking.dinnerStart,
        dinnerEnd: booking.dinnerEnd,
        ownerUserId: booking.ownerUserId,
        ownerName: booking.owner.name,
        purpose: booking.purpose,
      } as BookingMeta,
      createdAt: booking.createdAt,
    });
  }

  // 我参与的会议
  const myMeetings = await prisma.meeting.findMany({
    where: {
      isDeleted: false,
      startTime: { gte: from },
      endTime: { lte: to },
      participants: {
        some: { userId },
      },
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      _count: {
        select: {
          participants: true,
          externalGuests: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  for (const meeting of myMeetings) {
    events.push({
      id: meeting.id,
      eventType: 'MEETING',
      title: meeting.topic,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      status: meeting.status,
      venue: meeting.venue,
      location: meeting.location,
      visibilityScopeType: meeting.visibilityScopeType,
      visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
      canViewDetails: true,
      meta: {
        meetingKind: meeting.meetingKind,
        meetingLevel: meeting.meetingLevel,
        confidentiality: meeting.confidentiality,
        isOffline: meeting.isOffline,
        onlineLink: meeting.onlineLink,
        participantCount: meeting._count.participants,
        guestCount: meeting._count.externalGuests,
        projectId: meeting.projectId,
        projectName: meeting.project?.name ?? null,
      } as MeetingMeta,
      createdAt: meeting.createdAt,
    });
  }

  // 按开始时间排序
  events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return events;
};

