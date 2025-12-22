/**
 * 公司座谈会 Service - Node 5
 * PRD 19.6: 公司座谈会 CompanyMeeting
 * PRD 20: 会后 Token 发放任务
 */

import { prisma } from '../../utils/db.js';
import { BusinessError, ERROR_CODES } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { applyVisibilityFilter, canUserSeeObject, enforceHigherRoleVisibility, getRoleLevel } from '../../utils/visibility.js';
import { checkVenueConflict } from '../bookings/booking.service.js';
import { Decimal } from '@prisma/client/runtime/library';
import {
  GUEST_GRANT_DEFAULTS,
  type CreateMeetingInput,
  type UpdateMeetingInput,
  type AddParticipantInput,
  type UpdateParticipantInput,
  type AddGuestInput,
  type UpdateGuestInput,
  type UpdateMinutesInput,
  type ListMeetingsQuery,
  type MeetingResponse,
  type MeetingDetailResponse,
  type MeetingListResponse,
  type ParticipantResponse,
  type GuestResponse,
  type MinutesResponse,
  type FinishMeetingResponse,
  type IncompleteGuestInfo,
} from './meeting.dto.js';

// ================================
// 会议 CRUD
// ================================

/**
 * 创建公司座谈会
 * PRD 19.6.1: 默认管理员创建，可配置允许联合创始人创建
 */
export const createMeeting = async (
  input: CreateMeetingInput,
  userId: string,
  isAdmin: boolean,
  userRoleLevel: number
): Promise<MeetingDetailResponse> => {
  // 权限检查：公司座谈会默认只有管理员可创建，可配置允许联合创始人
  if (input.meetingKind === 'COMPANY' && !isAdmin && userRoleLevel < 3) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '只有管理员或联合创始人可以创建公司座谈会'
    );
  }

  // 场地验证
  if (input.venueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: input.venueId },
    });

    if (!venue) {
      throw new BusinessError(
        ERROR_CODES.RESOURCE_NOT_FOUND.code,
        '场地不存在'
      );
    }

    if (venue.status === 'DISABLED') {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        '该场地已停用'
      );
    }

    if (venue.status === 'MAINTENANCE') {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        '该场地正在维护中，无法创建会议'
      );
    }

    // 冲突检测
    const conflictResult = await checkVenueConflict({
      venueId: input.venueId,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    if (conflictResult.hasConflict) {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        `该时间段场地存在冲突: ${conflictResult.conflicts.map((c) => c.title).join(', ')}`
      );
    }
  }

  // 项目验证
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, isDeleted: false },
    });

    if (!project) {
      throw new BusinessError(
        ERROR_CODES.PROJECT_NOT_FOUND.code,
        '关联项目不存在'
      );
    }
  }

  // PRD 31.3: CUSTOM 可见性强制包含高层级用户
  let visibilityUserIds = input.visibilityUserIds || [];
  if (input.visibilityScopeType === 'CUSTOM' && visibilityUserIds.length > 0) {
    visibilityUserIds = await enforceHigherRoleVisibility(userRoleLevel, visibilityUserIds);
  }

  const meeting = await prisma.meeting.create({
    data: {
      topic: input.topic,
      meetingKind: input.meetingKind as 'DAILY' | 'COMPANY',
      meetingLevel: input.meetingLevel as 'INTERNAL' | 'EXTERNAL',
      confidentiality: input.confidentiality as 'LOW' | 'MEDIUM' | 'HIGH',
      venueId: input.venueId,
      location: input.location,
      isOffline: input.isOffline,
      onlineLink: input.onlineLink,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      projectId: input.projectId,
      visibilityScopeType: input.visibilityScopeType,
      visibilityMinRoleLevel: input.visibilityMinRoleLevel,
      visibilityUserIds,
      status: 'SCHEDULED',
      // 创建者作为主持人
      participants: {
        create: [
          {
            userId,
            role: 'HOST',
            attendanceStatus: 'ATTENDING',
          },
          ...(input.participants?.map((p) => ({
            userId: p.userId,
            role: p.role as 'HOST' | 'ATTENDEE' | 'OPTIONAL',
            attendanceStatus: 'INVITED' as const,
          })) || []),
        ],
      },
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      externalGuests: {
        include: {
          invitedBy: { select: { id: true, name: true } },
        },
      },
      minutes: true,
    },
  });

  // 审计日志
  await createAuditLog({
    userId,
    action: 'MEETING_CREATED',
    objectType: 'MEETING',
    objectId: meeting.id,
    summary: `创建会议: ${meeting.topic}`,
  });

  // 发送邀请通知给参与者
  const participantIds = input.participants?.map((p) => p.userId) || [];
  if (participantIds.length > 0) {
    await sendNotification({
      eventType: 'MEETING_INVITED',
      actorUserId: userId,
      targetUserIds: participantIds,
      relatedObjectType: 'MEETING',
      relatedObjectId: meeting.id,
      title: '会议邀请',
      content: `您已被邀请参加会议"${meeting.topic}"，时间: ${meeting.startTime.toLocaleString()}`,
    });
  }

  return formatMeetingDetailResponse(meeting, userId, isAdmin);
};

/**
 * 获取会议列表
 */
export const listMeetings = async (
  query: ListMeetingsQuery,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<MeetingListResponse> => {
  const { meetingKind, from, to, projectId, status, venueId, myMeetings, page, pageSize } = query;

  const where: Record<string, unknown> = {
    isDeleted: false,
  };

  if (meetingKind) {
    where.meetingKind = meetingKind;
  }

  if (from) {
    where.startTime = { gte: new Date(from) };
  }

  if (to) {
    where.endTime = { ...(where.endTime as object || {}), lte: new Date(to) };
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status;
  }

  if (venueId) {
    where.venueId = venueId;
  }

  if (myMeetings) {
    where.participants = {
      some: { userId },
    };
  }

  // 可见性过滤 - 暂时简化
  if (!isAdmin) {
    (where as any).OR = [
      { visibilityScopeType: 'ALL' },
      { participants: { some: { userId } } },
    ];
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true, address: true } },
        project: { select: { id: true, name: true } },
        _count: {
          select: {
            participants: true,
            externalGuests: true,
          },
        },
        minutes: { select: { id: true } },
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.meeting.count({ where }),
  ]);

  return {
    data: meetings.map((m) => formatMeetingResponse(m)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取单个会议详情
 */
export const getMeetingById = async (
  meetingId: string,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<MeetingDetailResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      isDeleted: false,
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      externalGuests: {
        where: { isDeleted: false },
        include: {
          invitedBy: { select: { id: true, name: true } },
        },
      },
      minutes: true,
    },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 可见性检查
  if (!isAdmin) {
    const canSee = canUserSeeObject(
      {
        visibilityScopeType: meeting.visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
        visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
        visibilityUserIds: meeting.visibilityUserIds,
      },
      userId,
      userRoleLevel
    );

    const isParticipant = meeting.participants.some((p) => p.userId === userId);

    if (!canSee && !isParticipant) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '无权查看此会议'
      );
    }
  }

  return formatMeetingDetailResponse(meeting, userId, isAdmin);
};

/**
 * 更新会议
 */
export const updateMeeting = async (
  meetingId: string,
  input: UpdateMeetingInput,
  userId: string,
  isAdmin: boolean
): Promise<MeetingDetailResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 权限检查：只有管理员或主持人可以修改
  if (!isAdmin) {
    const isHost = await prisma.meetingParticipant.findFirst({
      where: { meetingId, userId, role: 'HOST' },
    });
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以修改会议'
      );
    }
  }

  if (meeting.status !== 'SCHEDULED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '只能修改未开始的会议'
    );
  }

  // 场地冲突检测
  const newVenueId = input.venueId !== undefined ? input.venueId : meeting.venueId;
  const newStartTime = input.startTime ? new Date(input.startTime) : meeting.startTime;
  const newEndTime = input.endTime ? new Date(input.endTime) : meeting.endTime;

  if (newVenueId && (input.venueId || input.startTime || input.endTime)) {
    const conflictResult = await checkVenueConflict({
      venueId: newVenueId,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
    });

    // 排除当前会议的场地占用
    const filteredConflicts = conflictResult.conflicts.filter(
      (c) => !(c.eventType === 'MEETING' && c.id === meetingId)
    );

    if (filteredConflicts.length > 0) {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        `该时间段场地存在冲突`
      );
    }
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      ...(input.topic && { topic: input.topic }),
      ...(input.meetingLevel && { meetingLevel: input.meetingLevel }),
      ...(input.confidentiality && { confidentiality: input.confidentiality }),
      ...(input.venueId !== undefined && { venueId: input.venueId }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.isOffline !== undefined && { isOffline: input.isOffline }),
      ...(input.onlineLink !== undefined && { onlineLink: input.onlineLink }),
      ...(input.startTime && { startTime: newStartTime }),
      ...(input.endTime && { endTime: newEndTime }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.visibilityScopeType && { visibilityScopeType: input.visibilityScopeType }),
      ...(input.visibilityMinRoleLevel !== undefined && {
        visibilityMinRoleLevel: input.visibilityMinRoleLevel,
      }),
      ...(input.visibilityUserIds && { visibilityUserIds: input.visibilityUserIds }),
    },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      externalGuests: {
        where: { isDeleted: false },
        include: {
          invitedBy: { select: { id: true, name: true } },
        },
      },
      minutes: true,
    },
  });

  // 时间变更通知
  if (input.startTime || input.endTime) {
    const participantIds = updated.participants.map((p) => p.userId);
    await sendNotification({
      eventType: 'MEETING_TIME_CHANGED',
      actorUserId: userId,
      targetUserIds: participantIds,
      relatedObjectType: 'MEETING',
      relatedObjectId: meeting.id,
      title: '会议时间变更',
      content: `会议"${updated.topic}"时间已变更为: ${newStartTime.toLocaleString()}`,
    });
  }

  await createAuditLog({
    userId,
    action: 'MEETING_UPDATED',
    objectType: 'MEETING',
    objectId: meeting.id,
    summary: `更新会议: ${meeting.topic}`,
    metadata: { changes: input },
  });

  // PRD 19.7.4: 若关联项目，写入 ProjectEvent（仅时间变更时）
  const projectId = input.projectId !== undefined ? input.projectId : meeting.projectId;
  if (projectId && (input.startTime || input.endTime)) {
    await prisma.projectEvent.create({
      data: {
        projectId,
        eventType: 'MEETING_RESCHEDULED',
        actorUserId: userId,
        summary: `会议"${meeting.topic}"时间已调整`,
        metadata: {
          meetingId: meeting.id,
          oldStartTime: meeting.startTime,
          oldEndTime: meeting.endTime,
          newStartTime: input.startTime,
          newEndTime: input.endTime,
        },
      },
    });
  }

  return formatMeetingDetailResponse(updated, userId, isAdmin);
};

/**
 * 取消会议
 */
export const cancelMeeting = async (
  meetingId: string,
  userId: string,
  isAdmin: boolean,
  reason?: string
): Promise<MeetingDetailResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: {
      participants: true,
    },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  if (!isAdmin) {
    const isHost = meeting.participants.some(
      (p) => p.userId === userId && p.role === 'HOST'
    );
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以取消会议'
      );
    }
  }

  // PRD 31.6: 幂等 - 已取消则直接返回
  if (meeting.status === 'CANCELLED') {
    const fullMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        project: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        externalGuests: {
          where: { isDeleted: false },
          include: { invitedBy: { select: { id: true, name: true } } },
        },
        minutes: true,
      },
    });
    return formatMeetingDetailResponse(fullMeeting!, userId, isAdmin);
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: 'CANCELLED' },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      externalGuests: {
        where: { isDeleted: false },
        include: {
          invitedBy: { select: { id: true, name: true } },
        },
      },
      minutes: true,
    },
  });

  // 取消相关的待发放 Token 任务
  await prisma.tokenGrantTask.updateMany({
    where: {
      meetingId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
    },
  });

  // 通知参与者
  const participantIds = meeting.participants.map((p) => p.userId);
  await sendNotification({
    eventType: 'MEETING_CANCELLED',
    actorUserId: userId,
    targetUserIds: participantIds,
    relatedObjectType: 'MEETING',
    relatedObjectId: meeting.id,
    title: '会议已取消',
    content: `会议"${meeting.topic}"已取消${reason ? `，原因: ${reason}` : ''}`,
  });

  await createAuditLog({
    userId,
    action: 'MEETING_CANCELLED',
    objectType: 'MEETING',
    objectId: meeting.id,
    summary: `取消会议: ${meeting.topic}`,
    metadata: { reason },
  });

  // PRD 19.7.4: 若关联项目，写入 ProjectEvent
  if (meeting.projectId) {
    await prisma.projectEvent.create({
      data: {
        projectId: meeting.projectId,
        eventType: 'MEETING_CANCELLED',
        actorUserId: userId,
        summary: `会议"${meeting.topic}"已取消${reason ? `，原因: ${reason}` : ''}`,
        metadata: { meetingId: meeting.id, reason },
      },
    });
  }

  return formatMeetingDetailResponse(updated, userId, isAdmin);
};

/**
 * 结束会议（触发 Token 发放任务生成）
 * PRD 19.6.3: 会后补录流程
 * PRD 20: 会后 Token 发放任务
 * PRD 30.1: 返回缺字段清单
 */
export const finishMeeting = async (
  meetingId: string,
  userId: string,
  isAdmin: boolean
): Promise<FinishMeetingResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: {
      participants: true,
      externalGuests: {
        where: { isDeleted: false },
      },
    },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  if (!isAdmin) {
    const isHost = meeting.participants.some(
      (p) => p.userId === userId && p.role === 'HOST'
    );
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以结束会议'
      );
    }
  }

  // PRD 31.6: 幂等 - 已结束则直接返回
  if (meeting.status === 'FINISHED') {
    const fullMeeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        project: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        externalGuests: {
          where: { isDeleted: false },
          include: { invitedBy: { select: { id: true, name: true } } },
        },
        minutes: true,
      },
    });
    // 返回空的 incompleteGuests 和已创建的任务数
    const existingTasks = await prisma.tokenGrantTask.count({
      where: { meetingId },
    });
    return {
      meeting: formatMeetingDetailResponse(fullMeeting!, userId, isAdmin),
      grantTasksCreated: existingTasks,
      incompleteGuests: [],
    };
  }

  if (meeting.status !== 'SCHEDULED') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '只能结束进行中的会议'
    );
  }

  // PRD 30.1: 检查嘉宾字段完整性
  const incompleteGuests: IncompleteGuestInfo[] = [];
  for (const guest of meeting.externalGuests) {
    const missingFields: IncompleteGuestInfo['missingFields'] = [];
    if (!guest.invitedByUserId) missingFields.push('invitedBy');
    if (!guest.organization) missingFields.push('organization');
    if (!guest.title) missingFields.push('title');
    if (!guest.guestCategory || guest.guestCategory === 'OTHER') missingFields.push('guestCategory');
    
    if (missingFields.length > 0) {
      incompleteGuests.push({
        guestId: guest.id,
        guestName: guest.name,
        missingFields,
      });
    }
  }

  // 生成 Token 发放任务
  // PRD 20.2: 存在外部嘉宾且有邀请人，生成任务
  // PRD 30.1: 未补录（缺邀请人）不生成发放任务
  const tasksToCreate = meeting.externalGuests
    .filter((g) => g.invitedByUserId && g.organization && g.title)
    .map((guest) => {
      const defaultAmount = GUEST_GRANT_DEFAULTS[guest.guestCategory] || 0;
      return {
        meetingId: meeting.id,
        guestId: guest.id,
        inviterUserId: guest.invitedByUserId!,
        status: 'PENDING' as const,
        defaultAmount: new Decimal(defaultAmount),
      };
    });

  await prisma.$transaction(async (tx) => {
    // 更新会议状态
    await tx.meeting.update({
      where: { id: meetingId },
      data: { status: 'FINISHED' },
    });

    // 批量创建 Token 发放任务（跳过已存在的）
    for (const task of tasksToCreate) {
      const existing = await tx.tokenGrantTask.findUnique({
        where: { guestId: task.guestId },
      });
      if (!existing) {
        await tx.tokenGrantTask.create({ data: task });
      }
    }
  });

  const updated = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      project: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
      externalGuests: {
        where: { isDeleted: false },
        include: {
          invitedBy: { select: { id: true, name: true } },
        },
      },
      minutes: true,
    },
  });

  // 通知参与者：请补录邀请的外部嘉宾
  const participantIds = meeting.participants.map((p) => p.userId);
  await sendNotification({
    eventType: 'MEETING_FINISHED',
    actorUserId: userId,
    targetUserIds: participantIds,
    relatedObjectType: 'MEETING',
    relatedObjectId: meeting.id,
    title: '会议已结束',
    content: `会议"${meeting.topic}"已结束，请补录您邀请的外部嘉宾（如有）`,
  });

  await createAuditLog({
    userId,
    action: 'MEETING_FINISHED',
    objectType: 'MEETING',
    objectId: meeting.id,
    summary: `结束会议: ${meeting.topic}，生成 ${tasksToCreate.length} 个 Token 发放任务`,
  });

  // 写入项目时间线（包含缺字段信息）
  if (meeting.projectId) {
    await prisma.projectEvent.create({
      data: {
        projectId: meeting.projectId,
        eventType: 'MEETING_HELD',
        title: `会议结束: ${meeting.topic}`,
        description: `会议已归档，共 ${meeting.externalGuests.length} 位外部嘉宾`,
        relatedObjectType: 'MEETING',
        relatedObjectId: meeting.id,
        createdById: userId,
      },
    });
  }

  // PRD 30.1: 返回完整响应，包含缺字段清单
  return {
    meeting: formatMeetingDetailResponse(updated!, userId, isAdmin),
    grantTasksCreated: tasksToCreate.length,
    incompleteGuests,
  };
};

// ================================
// 参与者管理
// ================================

/**
 * 添加参与者
 */
export const addParticipant = async (
  meetingId: string,
  input: AddParticipantInput,
  userId: string,
  isAdmin: boolean
): Promise<ParticipantResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: { participants: true },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 权限检查
  if (!isAdmin) {
    const isHost = meeting.participants.some(
      (p) => p.userId === userId && p.role === 'HOST'
    );
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以添加参与者'
      );
    }
  }

  // 检查用户是否已是参与者
  const existing = meeting.participants.find((p) => p.userId === input.userId);
  if (existing) {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '该用户已是会议参与者'
    );
  }

  const participant = await prisma.meetingParticipant.create({
    data: {
      meetingId,
      userId: input.userId,
      role: input.role as 'HOST' | 'ATTENDEE' | 'OPTIONAL',
      attendanceStatus: 'INVITED',
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  // 发送邀请通知
  await sendNotification({
    eventType: 'MEETING_INVITED',
    actorUserId: userId,
    targetUserIds: [input.userId],
    relatedObjectType: 'MEETING',
    relatedObjectId: meetingId,
    title: '会议邀请',
    content: `您已被邀请参加会议"${meeting.topic}"`,
  });

  return formatParticipantResponse(participant);
};

/**
 * 更新参与者状态
 */
export const updateParticipant = async (
  meetingId: string,
  participantUserId: string,
  input: UpdateParticipantInput,
  userId: string,
  isAdmin: boolean
): Promise<ParticipantResponse> => {
  const participant = await prisma.meetingParticipant.findUnique({
    where: {
      meetingId_userId: { meetingId, userId: participantUserId },
    },
  });

  if (!participant) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '参与者不存在'
    );
  }

  // 权限检查：管理员、主持人可以修改任何人；本人可以修改自己的出席状态
  if (!isAdmin && participantUserId !== userId) {
    const isHost = await prisma.meetingParticipant.findFirst({
      where: { meetingId, userId, role: 'HOST' },
    });
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '无权修改此参与者'
      );
    }
  }

  // 本人只能修改出席状态，不能修改角色
  if (participantUserId === userId && input.role && !isAdmin) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '不能修改自己的角色'
    );
  }

  const updated = await prisma.meetingParticipant.update({
    where: {
      meetingId_userId: { meetingId, userId: participantUserId },
    },
    data: {
      ...(input.role && { role: input.role }),
      ...(input.attendanceStatus && { attendanceStatus: input.attendanceStatus }),
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  return formatParticipantResponse(updated);
};

/**
 * 移除参与者
 */
export const removeParticipant = async (
  meetingId: string,
  participantUserId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: { participants: true },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  const participant = meeting.participants.find((p) => p.userId === participantUserId);
  if (!participant) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '参与者不存在'
    );
  }

  // 权限检查
  if (!isAdmin) {
    const isHost = meeting.participants.some(
      (p) => p.userId === userId && p.role === 'HOST'
    );
    if (!isHost) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以移除参与者'
      );
    }
  }

  await prisma.meetingParticipant.delete({
    where: {
      meetingId_userId: { meetingId, userId: participantUserId },
    },
  });
};

// ================================
// 外部嘉宾管理
// ================================

/**
 * 添加外部嘉宾
 * PRD 19.6.5: 外部嘉宾若存在：必须有邀请人 + 组织 + 职位 + 姓名
 */
export const addGuest = async (
  meetingId: string,
  input: AddGuestInput,
  userId: string,
  isAdmin: boolean
): Promise<GuestResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: { participants: true },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 权限检查：管理员可以添加任何人邀请的嘉宾
  // 合伙人可以添加自己邀请的嘉宾（会后补录）
  const invitedByUserId = isAdmin && input.invitedByUserId
    ? input.invitedByUserId
    : userId;

  // 非管理员必须是会议参与者才能添加嘉宾
  if (!isAdmin) {
    const isParticipant = meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有会议参与者可以添加嘉宾'
      );
    }
  }

  const defaultAmount = GUEST_GRANT_DEFAULTS[input.guestCategory] || 0;

  const guest = await prisma.externalGuest.create({
    data: {
      meetingId,
      name: input.name,
      organization: input.organization,
      title: input.title,
      contact: input.contact,
      note: input.note,
      guestCategory: input.guestCategory as 'PUBLIC_CO_DMHG' | 'FIN_EXEC' | 'PUBLIC_CHAIRMAN_CONTROLLER' | 'MINISTRY_LEADER' | 'BUREAU_LEADER' | 'DEPT_LEADER' | 'OTHER',
      defaultGrantAmount: new Decimal(defaultAmount),
      invitedByUserId,
    },
    include: {
      invitedBy: { select: { id: true, name: true } },
    },
  });

  // 自动生成 Token 发放任务（无论会议状态，只要嘉宾信息完整）
  // 公司座谈会 (COMPANY) 才生成发放任务
  if (meeting.meetingKind === 'COMPANY' && input.organization && input.title) {
    await prisma.tokenGrantTask.create({
      data: {
        meetingId,
        guestId: guest.id,
        inviterUserId: invitedByUserId,
        status: 'PENDING',
        defaultAmount: new Decimal(defaultAmount),
      },
    });
  }

  return formatGuestResponse(guest, userId, isAdmin);
};

/**
 * 更新外部嘉宾
 */
export const updateGuest = async (
  guestId: string,
  input: UpdateGuestInput,
  userId: string,
  isAdmin: boolean
): Promise<GuestResponse> => {
  const guest = await prisma.externalGuest.findFirst({
    where: { id: guestId, isDeleted: false },
  });

  if (!guest) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '嘉宾不存在'
    );
  }

  // 权限检查：管理员或邀请人可以修改
  if (!isAdmin && guest.invitedByUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '只有管理员或邀请人可以修改嘉宾信息'
    );
  }

  const updated = await prisma.externalGuest.update({
    where: { id: guestId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.organization && { organization: input.organization }),
      ...(input.title && { title: input.title }),
      ...(input.contact !== undefined && { contact: input.contact }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.guestCategory && {
        guestCategory: input.guestCategory,
        defaultGrantAmount: new Decimal(GUEST_GRANT_DEFAULTS[input.guestCategory] || 0),
      }),
    },
    include: {
      invitedBy: { select: { id: true, name: true } },
    },
  });

  return formatGuestResponse(updated, userId, isAdmin);
};

/**
 * 删除外部嘉宾（软删除）
 */
export const deleteGuest = async (
  guestId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const guest = await prisma.externalGuest.findFirst({
    where: { id: guestId, isDeleted: false },
  });

  if (!guest) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '嘉宾不存在'
    );
  }

  if (!isAdmin && guest.invitedByUserId !== userId) {
    throw new BusinessError(
      ERROR_CODES.FORBIDDEN.code,
      '只有管理员或邀请人可以删除嘉宾'
    );
  }

  // 软删除嘉宾并取消对应的待发放任务
  await prisma.$transaction([
    prisma.externalGuest.update({
      where: { id: guestId },
      data: { isDeleted: true },
    }),
    prisma.tokenGrantTask.updateMany({
      where: {
        guestId,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    }),
  ]);
};

// ================================
// 会议纪要管理
// ================================

/**
 * 获取会议纪要
 */
export const getMinutes = async (
  meetingId: string,
  userId: string,
  userRoleLevel: number,
  isAdmin: boolean
): Promise<MinutesResponse | null> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: {
      minutes: true,
      participants: true,
    },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 可见性检查
  if (!isAdmin) {
    const canSee = canUserSeeObject(
      {
        visibilityScopeType: meeting.visibilityScopeType as 'ALL' | 'ROLE_MIN_LEVEL' | 'CUSTOM',
        visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
        visibilityUserIds: meeting.visibilityUserIds,
      },
      userId,
      userRoleLevel
    );
    const isParticipant = meeting.participants.some((p) => p.userId === userId);

    if (!canSee && !isParticipant) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '无权查看会议纪要'
      );
    }
  }

  if (!meeting.minutes) {
    return null;
  }

  return formatMinutesResponse(meeting.minutes);
};

/**
 * 更新会议纪要
 */
export const updateMinutes = async (
  meetingId: string,
  input: UpdateMinutesInput,
  userId: string,
  isAdmin: boolean
): Promise<MinutesResponse> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: { participants: true },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 权限检查：管理员、主持人、或被指派的记录员可以编辑
  if (!isAdmin) {
    const isHostOrRecorder = meeting.participants.some(
      (p) => p.userId === userId && (p.role === 'HOST')
    );
    if (!isHostOrRecorder) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以编辑纪要'
      );
    }
  }

  const minutes = await prisma.meetingMinutes.upsert({
    where: { meetingId },
    update: {
      content: input.content,
      attachments: input.attachments || [],
    },
    create: {
      meetingId,
      content: input.content,
      attachments: input.attachments || [],
    },
  });

  // 写入项目时间线
  if (meeting.projectId) {
    await prisma.projectEvent.create({
      data: {
        projectId: meeting.projectId,
        eventType: 'MEETING_MINUTES_ADDED',
        title: `会议纪要更新: ${meeting.topic}`,
        relatedObjectType: 'MEETING',
        relatedObjectId: meeting.id,
        createdById: userId,
      },
    });
  }

  return formatMinutesResponse(minutes);
};

// ================================
// 辅助函数
// ================================

function formatMeetingResponse(meeting: {
  id: string;
  topic: string;
  meetingKind: string;
  meetingLevel: string;
  confidentiality: string;
  venue: { id: string; name: string; address: string | null } | null;
  location: string | null;
  isOffline: boolean;
  onlineLink: string | null;
  startTime: Date;
  endTime: Date;
  project: { id: string; name: string } | null;
  visibilityScopeType: string;
  visibilityMinRoleLevel: number | null;
  visibilityUserIds: string[];
  status: string;
  _count: { participants: number; externalGuests: number };
  minutes: { id: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): MeetingResponse {
  return {
    id: meeting.id,
    topic: meeting.topic,
    meetingKind: meeting.meetingKind,
    meetingLevel: meeting.meetingLevel,
    confidentiality: meeting.confidentiality,
    venue: meeting.venue,
    location: meeting.location,
    isOffline: meeting.isOffline,
    onlineLink: meeting.onlineLink,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    project: meeting.project,
    visibilityScopeType: meeting.visibilityScopeType,
    visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
    visibilityUserIds: meeting.visibilityUserIds,
    status: meeting.status,
    participantCount: meeting._count.participants,
    guestCount: meeting._count.externalGuests,
    hasMinutes: !!meeting.minutes,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
  };
}

function formatMeetingDetailResponse(
  meeting: {
    id: string;
    topic: string;
    meetingKind: string;
    meetingLevel: string;
    confidentiality: string;
    venue: { id: string; name: string; address: string | null } | null;
    location: string | null;
    isOffline: boolean;
    onlineLink: string | null;
    startTime: Date;
    endTime: Date;
    project: { id: string; name: string } | null;
    visibilityScopeType: string;
    visibilityMinRoleLevel: number | null;
    visibilityUserIds: string[];
    status: string;
    participants: Array<{
      id: string;
      user: { id: string; name: string; avatar: string | null };
      role: string;
      attendanceStatus: string;
    }>;
    externalGuests: Array<{
      id: string;
      name: string;
      organization: string;
      title: string;
      contact: string | null;
      note: string | null;
      guestCategory: string;
      defaultGrantAmount: Decimal;
      finalGrantAmount: Decimal | null;
      invitedBy: { id: string; name: string };
      createdAt: Date;
    }>;
    minutes: {
      id: string;
      content: string;
      attachments: unknown;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  },
  currentUserId: string,
  isAdmin: boolean
): MeetingDetailResponse {
  return {
    id: meeting.id,
    topic: meeting.topic,
    meetingKind: meeting.meetingKind,
    meetingLevel: meeting.meetingLevel,
    confidentiality: meeting.confidentiality,
    venue: meeting.venue,
    location: meeting.location,
    isOffline: meeting.isOffline,
    onlineLink: meeting.onlineLink,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    project: meeting.project,
    visibilityScopeType: meeting.visibilityScopeType,
    visibilityMinRoleLevel: meeting.visibilityMinRoleLevel,
    visibilityUserIds: meeting.visibilityUserIds,
    status: meeting.status,
    participantCount: meeting.participants.length,
    guestCount: meeting.externalGuests.length,
    hasMinutes: !!meeting.minutes,
    participants: meeting.participants.map(formatParticipantResponse),
    guests: meeting.externalGuests.map((g) =>
      formatGuestResponse(g, currentUserId, isAdmin)
    ),
    minutes: meeting.minutes ? formatMinutesResponse(meeting.minutes) : null,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
  };
}

function formatParticipantResponse(participant: {
  id: string;
  user: { id: string; name: string; avatar: string | null };
  role: string;
  attendanceStatus: string;
}): ParticipantResponse {
  return {
    id: participant.id,
    user: participant.user,
    role: participant.role,
    attendanceStatus: participant.attendanceStatus,
  };
}

function formatGuestResponse(
  guest: {
    id: string;
    name: string;
    organization: string;
    title: string;
    contact: string | null;
    note: string | null;
    guestCategory: string;
    defaultGrantAmount: Decimal;
    finalGrantAmount: Decimal | null;
    invitedBy: { id: string; name: string };
    createdAt: Date;
  },
  currentUserId: string,
  isAdmin: boolean
): GuestResponse {
  // 敏感字段保护：只有管理员或邀请人可见联系方式
  const canSeeContact = isAdmin || guest.invitedBy.id === currentUserId;

  return {
    id: guest.id,
    name: guest.name,
    organization: guest.organization,
    title: guest.title,
    contact: canSeeContact ? guest.contact : null,
    note: guest.note,
    guestCategory: guest.guestCategory,
    defaultGrantAmount: guest.defaultGrantAmount.toNumber(),
    finalGrantAmount: guest.finalGrantAmount?.toNumber() ?? null,
    invitedBy: guest.invitedBy,
    createdAt: guest.createdAt,
  };
}

function formatMinutesResponse(minutes: {
  id: string;
  content: string;
  attachments: unknown;
  createdAt: Date;
  updatedAt: Date;
}): MinutesResponse {
  return {
    id: minutes.id,
    content: minutes.content,
    attachments: minutes.attachments as MinutesResponse['attachments'],
    createdAt: minutes.createdAt,
    updatedAt: minutes.updatedAt,
  };
}

// ================================
// PRD 19.6.3: 嘉宾补录完成度统计（管理员）
// ================================

export interface GuestCompletionStats {
  meetingId: string;
  meetingTopic: string;
  meetingStatus: string;
  totalParticipants: number;
  participantsWithGuests: number;
  participantsWithoutGuests: number;
  totalGuests: number;
  guestsWithFullInfo: number;
  completionRate: number;
}

/**
 * 获取嘉宾补录完成度（管理员）
 * PRD 19.6.3: 管理员可以查看"嘉宾补录完成度"
 */
export const getGuestCompletionStats = async (
  meetingId: string
): Promise<GuestCompletionStats> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: {
      participants: {
        select: { userId: true },
      },
      externalGuests: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          organization: true,
          title: true,
          invitedByUserId: true,
        },
      },
    },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  const participantUserIds = meeting.participants.map((p) => p.userId);
  const guestInviters = new Set(meeting.externalGuests.map((g) => g.invitedByUserId));
  
  const participantsWithGuests = participantUserIds.filter((id) => guestInviters.has(id)).length;
  const participantsWithoutGuests = participantUserIds.length - participantsWithGuests;

  // 检查嘉宾信息完整性
  const guestsWithFullInfo = meeting.externalGuests.filter(
    (g) => g.name && g.organization && g.title
  ).length;

  const completionRate = meeting.externalGuests.length > 0
    ? (guestsWithFullInfo / meeting.externalGuests.length) * 100
    : 0;

  return {
    meetingId: meeting.id,
    meetingTopic: meeting.topic,
    meetingStatus: meeting.status,
    totalParticipants: participantUserIds.length,
    participantsWithGuests,
    participantsWithoutGuests,
    totalGuests: meeting.externalGuests.length,
    guestsWithFullInfo,
    completionRate: Math.round(completionRate * 100) / 100,
  };
};

/**
 * 获取所有已结束会议的嘉宾补录统计（管理员）
 */
export const getAllGuestCompletionStats = async (): Promise<GuestCompletionStats[]> => {
  const meetings = await prisma.meeting.findMany({
    where: {
      isDeleted: false,
      meetingKind: 'COMPANY',
      status: 'FINISHED',
    },
    include: {
      participants: {
        select: { userId: true },
      },
      externalGuests: {
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          organization: true,
          title: true,
          invitedByUserId: true,
        },
      },
    },
    orderBy: { endTime: 'desc' },
    take: 50,
  });

  return meetings.map((meeting) => {
    const participantUserIds = meeting.participants.map((p) => p.userId);
    const guestInviters = new Set(meeting.externalGuests.map((g) => g.invitedByUserId));
    
    const participantsWithGuests = participantUserIds.filter((id) => guestInviters.has(id)).length;
    const participantsWithoutGuests = participantUserIds.length - participantsWithGuests;

    const guestsWithFullInfo = meeting.externalGuests.filter(
      (g) => g.name && g.organization && g.title
    ).length;

    const completionRate = meeting.externalGuests.length > 0
      ? (guestsWithFullInfo / meeting.externalGuests.length) * 100
      : 0;

    return {
      meetingId: meeting.id,
      meetingTopic: meeting.topic,
      meetingStatus: meeting.status,
      totalParticipants: participantUserIds.length,
      participantsWithGuests,
      participantsWithoutGuests,
      totalGuests: meeting.externalGuests.length,
      guestsWithFullInfo,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  });
};

// ================================
// 人脉资源关联
// ================================

/**
 * 关联人脉资源到会议
 */
export const linkNetworkResource = async (
  meetingId: string,
  networkResourceId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, isDeleted: false },
    include: { participants: true },
  });

  if (!meeting) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '会议不存在'
    );
  }

  // 权限检查
  if (!isAdmin) {
    const isParticipant = meeting.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有会议参与者可以关联人脉资源'
      );
    }
  }

  // 检查人脉资源是否存在
  const resource = await prisma.networkResource.findFirst({
    where: { id: networkResourceId, isDeleted: false },
  });

  if (!resource) {
    throw new BusinessError(
      ERROR_CODES.NETWORK_RESOURCE_NOT_FOUND.code,
      '人脉资源不存在'
    );
  }

  // 创建关联（忽略已存在）
  await prisma.meetingNetworkLink.upsert({
    where: {
      meetingId_networkResourceId: { meetingId, networkResourceId },
    },
    update: {},
    create: { meetingId, networkResourceId },
  });
};

/**
 * 获取会议关联的人脉资源
 */
export const getMeetingNetworkLinks = async (
  meetingId: string
): Promise<Array<{ id: string; name: string | null; organization: string | null; resourceType: string }>> => {
  const links = await prisma.meetingNetworkLink.findMany({
    where: { meetingId },
    include: {
      networkResource: {
        select: {
          id: true,
          name: true,
          organization: true,
          resourceType: true,
        },
      },
    },
  });

  return links.map((link) => ({
    id: link.networkResource.id,
    name: link.networkResource.name,
    organization: link.networkResource.organization,
    resourceType: link.networkResource.resourceType,
  }));
};

/**
 * 移除人脉资源关联
 */
export const unlinkNetworkResource = async (
  meetingId: string,
  networkResourceId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  if (!isAdmin) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, isDeleted: false },
      include: { participants: { where: { userId, role: 'HOST' } } },
    });

    if (!meeting || meeting.participants.length === 0) {
      throw new BusinessError(
        ERROR_CODES.FORBIDDEN.code,
        '只有管理员或会议主持人可以移除人脉资源关联'
      );
    }
  }

  await prisma.meetingNetworkLink.deleteMany({
    where: { meetingId, networkResourceId },
  });
}

