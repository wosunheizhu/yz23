/**
 * 场地预约 Service - Node 5
 * PRD 19.5: 场地预约 VenueBooking
 * PRD 19.5.4: 冲突规则
 * PRD 19.7.5: 管理员强制覆盖
 */

import { prisma } from '../../utils/db.js';
import { BusinessError, ERROR_CODES } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { applyVisibilityFilter, canUserSeeObject, enforceHigherRoleVisibility, getRoleLevel } from '../../utils/visibility.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  CancelBookingInput,
  AdminOverrideInput,
  ListBookingsQuery,
  BookingResponse,
  BookingListResponse,
  ConflictResult,
  CheckConflictInput,
} from './booking.dto.js';

// ================================
// 冲突检测服务（域服务）
// PRD 19.7.3: 冲突校验服务
// ================================

/**
 * 检查场地时间冲突
 * PRD 19.5.4: 同一 venue_id 同一时间段：任意重叠视为冲突
 */
export const checkVenueConflict = async (
  input: CheckConflictInput
): Promise<ConflictResult> => {
  const { venueId, startTime, endTime, excludeBookingId } = input;
  const start = new Date(startTime);
  const end = new Date(endTime);

  // 查找冲突的预约（未取消、未删除）
  const conflictingBookings = await prisma.venueBooking.findMany({
    where: {
      venueId,
      isDeleted: false,
      status: { not: 'CANCELLED' },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      // 时间重叠检测: start < other_end && end > other_start
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  // 查找冲突的会议（未取消、未删除）
  const conflictingMeetings = await prisma.meeting.findMany({
    where: {
      venueId,
      isDeleted: false,
      status: { not: 'CANCELLED' },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: {
      id: true,
      topic: true,
      startTime: true,
      endTime: true,
    },
  });

  const conflicts: ConflictResult['conflicts'] = [
    ...conflictingBookings.map((b) => ({
      id: b.id,
      eventType: 'BOOKING' as const,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      ownerName: b.owner.name,
    })),
    ...conflictingMeetings.map((m) => ({
      id: m.id,
      eventType: 'MEETING' as const,
      title: m.topic,
      startTime: m.startTime,
      endTime: m.endTime,
      ownerName: '公司座谈会',
    })),
  ];

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};

// ================================
// 预约 CRUD
// ================================

/**
 * 创建场地预约
 * PRD 19.5.4: 普通用户：冲突则拒绝
 */
export const createBooking = async (
  input: CreateBookingInput,
  userId: string,
  isAdmin: boolean
): Promise<BookingResponse> => {
  // 检查场地是否存在且可用
  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
  });

  if (!venue) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '场地不存在'
    );
  }

  // PRD 19.4.3: Venue 被 DISABLED 后：不可创建新事件
  if (venue.status === 'DISABLED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该场地已停用，无法创建预约'
    );
  }

  if (venue.status === 'MAINTENANCE') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该场地正在维护中，无法创建预约'
    );
  }

  // 餐食验证
  if (input.mealIncluded && !venue.supportsMeal) {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该场地不支持餐食服务'
    );
  }

  // 验证用餐时间在预约时间范围内（±30分钟缓冲）
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const bufferMs = 30 * 60 * 1000; // 30分钟

  if (input.mealIncluded && input.mealTypes) {
    if (input.mealTypes.includes('LUNCH') && input.lunchStart && input.lunchEnd) {
      const lunchStart = new Date(input.lunchStart);
      const lunchEnd = new Date(input.lunchEnd);
      if (
        lunchStart.getTime() < startTime.getTime() - bufferMs ||
        lunchEnd.getTime() > endTime.getTime() + bufferMs
      ) {
        throw new BusinessError(
          ERROR_CODES.VALIDATION_ERROR.code,
          '午餐时间必须在预约时间范围内（±30分钟）'
        );
      }
    }
    if (input.mealTypes.includes('DINNER') && input.dinnerStart && input.dinnerEnd) {
      const dinnerStart = new Date(input.dinnerStart);
      const dinnerEnd = new Date(input.dinnerEnd);
      if (
        dinnerStart.getTime() < startTime.getTime() - bufferMs ||
        dinnerEnd.getTime() > endTime.getTime() + bufferMs
      ) {
        throw new BusinessError(
          ERROR_CODES.VALIDATION_ERROR.code,
          '晚餐时间必须在预约时间范围内（±30分钟）'
        );
      }
    }
  }

  // PRD 24.1: 普通用户创建场地预约：若冲突 → 必须失败（后端拒绝）
  const conflictResult = await checkVenueConflict({
    venueId: input.venueId,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  if (conflictResult.hasConflict) {
    const conflictDesc = conflictResult.conflicts
      .map((c) => `${c.eventType === 'BOOKING' ? '预约' : '会议'}: ${c.title}`)
      .join(', ');
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      `该时间段存在冲突: ${conflictDesc}`
    );
  }

  // 确定预约所有者（管理员可代订）
  const ownerUserId = isAdmin && input.ownerUserId ? input.ownerUserId : userId;

  // PRD 31.3: CUSTOM 可见性强制包含高层级用户
  let visibilityUserIds = input.visibilityUserIds || [];
  if (input.visibilityScopeType === 'CUSTOM' && visibilityUserIds.length > 0) {
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleLevel: true },
    });
    const creatorRoleLevel = creator ? getRoleLevel(creator.roleLevel) : 1;
    visibilityUserIds = await enforceHigherRoleVisibility(creatorRoleLevel, visibilityUserIds);
  }

  const booking = await prisma.venueBooking.create({
    data: {
      venueId: input.venueId,
      title: input.title,
      purpose: input.purpose,
      startTime,
      endTime,
      ownerUserId,
      companionUserIds: input.companionUserIds || [],
      note: input.note,
      visibilityScopeType: input.visibilityScopeType,
      visibilityMinRoleLevel: input.visibilityMinRoleLevel,
      visibilityUserIds,
      mealIncluded: input.mealIncluded,
      mealTypes: input.mealTypes || [],
      lunchStart: input.lunchStart ? new Date(input.lunchStart) : null,
      lunchEnd: input.lunchEnd ? new Date(input.lunchEnd) : null,
      dinnerStart: input.dinnerStart ? new Date(input.dinnerStart) : null,
      dinnerEnd: input.dinnerEnd ? new Date(input.dinnerEnd) : null,
      status: 'CONFIRMED',
      createdByUserId: userId,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // 获取同行人员信息
  let companions: Array<{ id: string; name: string; avatar: string | null }> = [];
  if (input.companionUserIds && input.companionUserIds.length > 0) {
    companions = await prisma.user.findMany({
      where: { id: { in: input.companionUserIds } },
      select: { id: true, name: true, avatar: true },
    });
  }

  // 审计日志
  await createAuditLog({
    userId,
    action: 'BOOKING_CREATED',
    objectType: 'VENUE_BOOKING',
    objectId: booking.id,
    summary: `创建场地预约: ${booking.title} @ ${venue.name}`,
  });

  // PRD 19.5.5: 发送通知（使用人 + 同行内部人员 + 管理员）
  const notifyUserIds = [ownerUserId, ...(input.companionUserIds || [])];
  // 获取管理员列表
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, isDeleted: false },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id).filter((id) => id !== userId);
  
  await sendNotification({
    eventType: 'BOOKING_CREATED',
    actorUserId: userId,
    targetUserIds: [...new Set([...notifyUserIds, ...adminIds])],
    relatedObjectType: 'VENUE_BOOKING',
    relatedObjectId: booking.id,
    title: '场地预约创建成功',
    content: `场地预约"${booking.title}"已创建成功，时间: ${startTime.toLocaleString()}`,
  });

  return formatBookingResponse({ ...booking, companions });
};

/**
 * 获取预约列表
 */
export const listBookings = async (
  query: ListBookingsQuery,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<BookingListResponse> => {
  const { venueId, from, to, owner, status, mealIncluded, page, pageSize } = query;

  const where: Record<string, unknown> = {
    isDeleted: false,
  };

  if (venueId) {
    where.venueId = venueId;
  }

  if (from) {
    where.startTime = { gte: new Date(from) };
  }

  if (to) {
    where.endTime = { ...(where.endTime as object || {}), lte: new Date(to) };
  }

  if (owner === 'me') {
    where.ownerUserId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (mealIncluded !== undefined) {
    where.mealIncluded = mealIncluded;
  }

  // 应用可见性过滤（非管理员）- VenueBooking 使用 ownerUserId 作为所有者字段
  if (!isAdmin) {
    const visibilityFilter = applyVisibilityFilter(userId, userRoleLevel, isAdmin, where);
    // 添加 owner 条件：用户是预约所有者也能看到
    where.OR = [
      ...(visibilityFilter.OR || []),
      { ownerUserId: userId },
      { companionUserIds: { has: userId } }, // 同行人员也能看到
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.venueBooking.findMany({
      where: where as any,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        owner: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venueBooking.count({ where }),
  ]);

  // 获取所有同行人员
  const allCompanionIds = [...new Set(bookings.flatMap((b) => b.companionUserIds))];
  const companionUsers = allCompanionIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: allCompanionIds } },
        select: { id: true, name: true, avatar: true },
      })
    : [];
  const companionMap = new Map(companionUsers.map((u) => [u.id, u]));

  return {
    data: bookings.map((booking) => formatBookingResponse({
      ...booking,
      companions: booking.companionUserIds
        .map((id) => companionMap.get(id))
        .filter((u): u is { id: string; name: string; avatar: string | null } => !!u),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取单个预约详情
 */
export const getBookingById = async (
  bookingId: string,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<BookingResponse> => {
  const booking = await prisma.venueBooking.findFirst({
    where: {
      id: bookingId,
      isDeleted: false,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!booking) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '预约不存在'
    );
  }

  // 可见性检查
  if (!isAdmin) {
    const canSee = canUserSeeObject(
      userId,
      userRoleLevel,
      isAdmin,
      {
        visibilityScopeType: booking.visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
        visibilityMinRoleLevel: booking.visibilityMinRoleLevel,
        visibilityUserIds: booking.visibilityUserIds,
      }
    );

    // 预约所有者或同行人员总是可见
    const isCompanion = booking.companionUserIds.includes(userId);
    if (!canSee && booking.ownerUserId !== userId && !isCompanion) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '无权查看此预约'
      );
    }
  }

  // 获取同行人员信息
  const companions = booking.companionUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: booking.companionUserIds } },
        select: { id: true, name: true, avatar: true },
      })
    : [];

  return formatBookingResponse({ ...booking, companions });
};

/**
 * 更新预约
 */
export const updateBooking = async (
  bookingId: string,
  input: UpdateBookingInput,
  userId: string,
  isAdmin: boolean
): Promise<BookingResponse> => {
  const booking = await prisma.venueBooking.findFirst({
    where: {
      id: bookingId,
      isDeleted: false,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
    },
  });

  if (!booking) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '预约不存在'
    );
  }

  // 权限检查：只有所有者或管理员可以修改
  if (!isAdmin && booking.ownerUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '无权修改此预约'
    );
  }

  // 已取消或已完成的预约不能修改
  if (booking.status !== 'CONFIRMED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '只能修改已确认的预约'
    );
  }

  // 处理场地变更
  const newVenueId = input.venueId || booking.venueId;
  
  // 如果更换了场地，验证新场地是否存在且可用
  if (input.venueId && input.venueId !== booking.venueId) {
    const newVenue = await prisma.venue.findFirst({
      where: {
        id: input.venueId,
        status: 'ACTIVE',
      },
    });
    if (!newVenue) {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        '所选场地不存在或不可用'
      );
    }
  }
  
  // 如果修改时间或场地，检查冲突
  const newStartTime = input.startTime ? new Date(input.startTime) : booking.startTime;
  const newEndTime = input.endTime ? new Date(input.endTime) : booking.endTime;

  if (input.startTime || input.endTime || input.venueId) {
    const conflictResult = await checkVenueConflict({
      venueId: newVenueId,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      excludeBookingId: bookingId,
    });

    if (conflictResult.hasConflict) {
      const conflictDesc = conflictResult.conflicts
        .map((c) => `${c.eventType === 'BOOKING' ? '预约' : '会议'}: ${c.title}`)
        .join(', ');
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        `修改后的时间存在冲突: ${conflictDesc}`
      );
    }
  }

  const updated = await prisma.venueBooking.update({
    where: { id: bookingId },
    data: {
      // 场地变更
      ...(input.venueId && { venueId: input.venueId }),
      ...(input.title && { title: input.title }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.startTime && { startTime: newStartTime }),
      ...(input.endTime && { endTime: newEndTime }),
      // PRD 19.5.2: 同行内部人员 + 备注
      ...(input.companionUserIds && { companionUserIds: input.companionUserIds }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.visibilityScopeType && { visibilityScopeType: input.visibilityScopeType }),
      ...(input.visibilityMinRoleLevel !== undefined && {
        visibilityMinRoleLevel: input.visibilityMinRoleLevel,
      }),
      ...(input.visibilityUserIds && { visibilityUserIds: input.visibilityUserIds }),
      ...(input.mealIncluded !== undefined && { mealIncluded: input.mealIncluded }),
      ...(input.mealTypes && { mealTypes: input.mealTypes }),
      ...(input.lunchStart !== undefined && {
        lunchStart: input.lunchStart ? new Date(input.lunchStart) : null,
      }),
      ...(input.lunchEnd !== undefined && {
        lunchEnd: input.lunchEnd ? new Date(input.lunchEnd) : null,
      }),
      ...(input.dinnerStart !== undefined && {
        dinnerStart: input.dinnerStart ? new Date(input.dinnerStart) : null,
      }),
      ...(input.dinnerEnd !== undefined && {
        dinnerEnd: input.dinnerEnd ? new Date(input.dinnerEnd) : null,
      }),
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // 审计日志
  await createAuditLog({
    userId,
    action: 'BOOKING_UPDATED',
    objectType: 'VENUE_BOOKING',
    objectId: booking.id,
    summary: `更新场地预约: ${booking.title}`,
    metadata: { changes: input },
  });

  // PRD 19.5.5: 发送通知（使用人 + 同行内部人员 + 管理员）
  const notifyIds = [
    booking.ownerUserId,
    ...booking.companionUserIds,
  ].filter((id) => id !== userId);

  // 获取管理员
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, isDeleted: false },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id).filter((id) => id !== userId);

  if (notifyIds.length > 0 || adminIds.length > 0) {
    await sendNotification({
      eventType: 'BOOKING_UPDATED',
      actorUserId: userId,
      targetUserIds: [...new Set([...notifyIds, ...adminIds])],
      relatedObjectType: 'VENUE_BOOKING',
      relatedObjectId: booking.id,
      title: '场地预约已修改',
      content: `场地预约"${booking.title}"已被修改`,
    });
  }

  return formatBookingResponse(updated);
};

/**
 * 取消预约
 * PRD 19.5.6: 取消预约后：该时间段立即可被他人预订
 */
export const cancelBooking = async (
  bookingId: string,
  input: CancelBookingInput,
  userId: string,
  isAdmin: boolean
): Promise<BookingResponse> => {
  const booking = await prisma.venueBooking.findFirst({
    where: {
      id: bookingId,
      isDeleted: false,
    },
  });

  if (!booking) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '预约不存在'
    );
  }

  // 权限检查
  if (!isAdmin && booking.ownerUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '无权取消此预约'
    );
  }

  // PRD 31.6: 幂等 - 已取消则直接返回
  if (booking.status === 'CANCELLED') {
    const companions = booking.companionUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: booking.companionUserIds } },
          select: { id: true, name: true, avatar: true },
        })
      : [];
    const fullBooking = await prisma.venueBooking.findUnique({
      where: { id: bookingId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        owner: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return formatBookingResponse({ ...fullBooking!, companions });
  }

  const updated = await prisma.venueBooking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      adminOverrideNote: input.reason,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // 审计日志
  await createAuditLog({
    userId,
    action: 'BOOKING_CANCELLED',
    objectType: 'VENUE_BOOKING',
    objectId: booking.id,
    summary: `取消场地预约: ${booking.title}`,
    metadata: { reason: input.reason },
  });

  // PRD 19.5.5: 发送通知（使用人 + 同行内部人员 + 管理员）
  const notifyIds = [
    booking.ownerUserId,
    ...booking.companionUserIds,
  ].filter((id) => id !== userId);

  // 获取管理员
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, isDeleted: false },
    select: { id: true },
  });
  const adminIds = admins.map((a) => a.id).filter((id) => id !== userId);

  await sendNotification({
    eventType: 'BOOKING_CANCELLED',
    actorUserId: userId,
    targetUserIds: [...new Set([...notifyIds, ...adminIds])],
    relatedObjectType: 'VENUE_BOOKING',
    relatedObjectId: booking.id,
    title: '场地预约已取消',
    content: `场地预约"${booking.title}"已取消${input.reason ? `，原因: ${input.reason}` : ''}`,
  });

  return formatBookingResponse(updated);
};

/**
 * 管理员强制覆盖
 * PRD 19.7.5: 管理员强制覆盖
 */
export const adminOverride = async (
  bookingId: string,
  input: AdminOverrideInput,
  adminUserId: string
): Promise<BookingResponse> => {
  const booking = await prisma.venueBooking.findFirst({
    where: {
      id: bookingId,
      isDeleted: false,
    },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  if (!booking) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '预约不存在'
    );
  }

  let updated;

  switch (input.action) {
    case 'CANCEL_ORIGINAL':
      updated = await prisma.venueBooking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          adminOverrideFlag: true,
          adminOverrideNote: input.reason,
        },
        include: {
          venue: { select: { id: true, name: true, address: true } },
          owner: { select: { id: true, name: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      break;

    case 'RESCHEDULE_ORIGINAL':
      if (!input.payload?.newStartTime || !input.payload?.newEndTime) {
        throw new BusinessError(
          ERROR_CODES.VALIDATION_ERROR.code,
          '改期操作需要提供新的开始和结束时间'
        );
      }
      updated = await prisma.venueBooking.update({
        where: { id: bookingId },
        data: {
          startTime: new Date(input.payload.newStartTime),
          endTime: new Date(input.payload.newEndTime),
          adminOverrideFlag: true,
          adminOverrideNote: input.reason,
        },
        include: {
          venue: { select: { id: true, name: true, address: true } },
          owner: { select: { id: true, name: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      break;

    case 'FORCE_INSERT':
      // 强制插入不修改当前预约，只是标记
      updated = await prisma.venueBooking.update({
        where: { id: bookingId },
        data: {
          adminOverrideFlag: true,
          adminOverrideNote: input.reason,
        },
        include: {
          venue: { select: { id: true, name: true, address: true } },
          owner: { select: { id: true, name: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      break;
  }

  // 审计日志 PRD 19.7.4
  await createAuditLog({
    userId: adminUserId,
    action: 'BOOKING_ADMIN_OVERRIDE',
    objectType: 'VENUE_BOOKING',
    objectId: booking.id,
    summary: `管理员覆盖操作: ${input.action} - ${booking.title}`,
    metadata: { action: input.action, reason: input.reason, payload: input.payload },
  });

  // PRD 19.7.5: 发通知（站内 + 邮件）
  await sendNotification({
    eventType: 'BOOKING_ADMIN_OVERRIDE',
    actorUserId: adminUserId,
    targetUserIds: [booking.ownerUserId],
    relatedObjectType: 'VENUE_BOOKING',
    relatedObjectId: booking.id,
    title: '场地预约被管理员调整',
    content: `您的场地预约"${booking.title}"已被管理员${
      input.action === 'CANCEL_ORIGINAL' ? '取消' : '调整'
    }，原因: ${input.reason}`,
  });

  return formatBookingResponse(updated!);
};

/**
 * 完成预约（设为已结束）
 */
export const finishBooking = async (
  bookingId: string,
  userId: string,
  isAdmin: boolean
): Promise<BookingResponse> => {
  const booking = await prisma.venueBooking.findFirst({
    where: {
      id: bookingId,
      isDeleted: false,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!booking) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '预约不存在'
    );
  }

  if (!isAdmin && booking.ownerUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '无权操作此预约'
    );
  }

  // PRD 31.6: 幂等 - 已完成则直接返回
  if (booking.status === 'FINISHED') {
    const companions = booking.companionUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: booking.companionUserIds } },
          select: { id: true, name: true, avatar: true },
        })
      : [];
    return formatBookingResponse({ ...booking, companions });
  }

  if (booking.status !== 'CONFIRMED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '只能完成已确认的预约'
    );
  }

  const updated = await prisma.venueBooking.update({
    where: { id: bookingId },
    data: { status: 'FINISHED' },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    userId,
    action: 'BOOKING_FINISHED',
    objectType: 'VENUE_BOOKING',
    objectId: booking.id,
    summary: `完成场地预约: ${booking.title}`,
  });

  return formatBookingResponse(updated);
};

// ================================
// 辅助函数
// ================================

function formatBookingResponse(booking: {
  id: string;
  venue: { id: string; name: string; address: string | null };
  title: string;
  purpose: string | null;
  startTime: Date;
  endTime: Date;
  owner: { id: string; name: string; avatar: string | null };
  companions?: Array<{ id: string; name: string; avatar: string | null }>;
  note?: string | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  mealIncluded: boolean;
  mealTypes: string[];
  lunchStart: Date | null;
  lunchEnd: Date | null;
  dinnerStart: Date | null;
  dinnerEnd: Date | null;
  status: string;
  adminOverrideFlag: boolean;
  adminOverrideNote: string | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}): BookingResponse {
  return {
    id: booking.id,
    venue: booking.venue,
    title: booking.title,
    purpose: booking.purpose,
    startTime: booking.startTime,
    endTime: booking.endTime,
    owner: booking.owner,
    companions: booking.companions || [],
    note: booking.note ?? null,
    visibilityScopeType: booking.visibilityScopeType,
    visibilityMinRoleLevel: booking.visibilityMinRoleLevel,
    visibilityUserIds: booking.visibilityUserIds,
    mealIncluded: booking.mealIncluded,
    mealTypes: booking.mealTypes as BookingResponse['mealTypes'],
    lunchStart: booking.lunchStart,
    lunchEnd: booking.lunchEnd,
    dinnerStart: booking.dinnerStart,
    dinnerEnd: booking.dinnerEnd,
    status: booking.status as BookingResponse['status'],
    adminOverrideFlag: booking.adminOverrideFlag,
    adminOverrideNote: booking.adminOverrideNote,
    createdBy: booking.createdBy,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

/**
 * 获取可选时间建议
 * PRD: 冲突则拒绝并提示可选时间
 */
export const getSuggestedSlots = async (
  venueId: string,
  desiredDate: Date,
  durationMinutes: number
): Promise<Array<{ startTime: Date; endTime: Date }>> => {
  const dayStart = new Date(desiredDate);
  dayStart.setHours(8, 0, 0, 0); // 假设工作时间从8点开始
  const dayEnd = new Date(desiredDate);
  dayEnd.setHours(22, 0, 0, 0); // 假设到22点结束

  // 获取当天所有预约和会议
  const [bookings, meetings] = await Promise.all([
    prisma.venueBooking.findMany({
      where: {
        venueId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.meeting.findMany({
      where: {
        venueId,
        isDeleted: false,
        status: { not: 'CANCELLED' },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  // 合并所有占用时间段
  const occupiedSlots = [...bookings, ...meetings].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const suggestedSlots: Array<{ startTime: Date; endTime: Date }> = [];
  const durationMs = durationMinutes * 60 * 1000;

  let currentStart = dayStart;

  for (const slot of occupiedSlots) {
    // 检查当前空闲时间段是否足够
    if (slot.startTime.getTime() - currentStart.getTime() >= durationMs) {
      suggestedSlots.push({
        startTime: new Date(currentStart),
        endTime: new Date(currentStart.getTime() + durationMs),
      });
    }
    // 更新当前开始时间为此占用结束时间
    if (slot.endTime.getTime() > currentStart.getTime()) {
      currentStart = slot.endTime;
    }
  }

  // 检查最后一个时间段到工作时间结束
  if (dayEnd.getTime() - currentStart.getTime() >= durationMs) {
    suggestedSlots.push({
      startTime: new Date(currentStart),
      endTime: new Date(currentStart.getTime() + durationMs),
    });
  }

  return suggestedSlots.slice(0, 5); // 最多返回5个建议
}

