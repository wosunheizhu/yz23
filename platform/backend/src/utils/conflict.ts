/**
 * 冲突检测工具
 * 元征 · 合伙人赋能平台
 * 
 * PRD 4.4: 场地预约（Booking）与公司座谈会（Meeting）共享同一"时间轴"
 * PRD 19.5.4: 同一 venue_id 同一时间段任意重叠（start < other_end && end > other_start）视为冲突
 */

import { prisma } from './db.js';
import { isTimeRangeOverlap } from './datetime.js';
import { ConflictError, ErrorCodes } from './errors.js';
import { logger } from './logger.js';

/**
 * 冲突对象类型
 */
export type ConflictObjectType = 'BOOKING' | 'MEETING';

/**
 * 冲突详情
 */
export interface ConflictDetail {
  type: ConflictObjectType;
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  ownerName?: string;
}

/**
 * 冲突检查结果
 */
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
}

/**
 * 检查场地时间冲突
 * @param venueId 场地ID
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param excludeId 排除的ID（用于编辑时排除自己）
 * @param excludeType 排除的类型
 */
export const checkVenueConflict = async (
  venueId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
  excludeType?: ConflictObjectType
): Promise<ConflictCheckResult> => {
  const conflicts: ConflictDetail[] = [];
  
  // 检查场地预约冲突
  const bookings = await prisma.venueBooking.findMany({
    where: {
      venueId,
      status: 'CONFIRMED',
      isDeleted: false,
      ...(excludeType === 'BOOKING' && excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: {
      owner: { select: { name: true } },
    },
  });
  
  for (const booking of bookings) {
    if (isTimeRangeOverlap(
      { startTime, endTime },
      { startTime: booking.startTime, endTime: booking.endTime }
    )) {
      conflicts.push({
        type: 'BOOKING',
        id: booking.id,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        ownerName: booking.owner.name,
      });
    }
  }
  
  // 检查会议冲突
  const meetings = await prisma.meeting.findMany({
    where: {
      venueId,
      status: { in: ['SCHEDULED'] },
      isDeleted: false,
      ...(excludeType === 'MEETING' && excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  
  for (const meeting of meetings) {
    if (isTimeRangeOverlap(
      { startTime, endTime },
      { startTime: meeting.startTime, endTime: meeting.endTime }
    )) {
      conflicts.push({
        type: 'MEETING',
        id: meeting.id,
        title: meeting.topic,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      });
    }
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};

/**
 * 强制检查冲突，有冲突则抛出异常
 */
export const enforceNoConflict = async (
  venueId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
  excludeType?: ConflictObjectType
): Promise<void> => {
  const result = await checkVenueConflict(
    venueId,
    startTime,
    endTime,
    excludeId,
    excludeType
  );
  
  if (result.hasConflict) {
    logger.warn({
      venueId,
      startTime,
      endTime,
      conflicts: result.conflicts,
    }, '场地时间冲突');
    
    throw new ConflictError(ErrorCodes.VENUE_BOOKING_CONFLICT, {
      conflicts: result.conflicts.map(c => ({
        type: c.type,
        id: c.id,
        title: c.title,
        startTime: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
        ownerName: c.ownerName,
      })),
    });
  }
};

/**
 * 获取可用时间段
 * @param venueId 场地ID
 * @param date 日期
 * @param workingHours 工作时间段 { start: 9, end: 18 }
 */
export const getAvailableSlots = async (
  venueId: string,
  date: Date,
  workingHours: { start: number; end: number } = { start: 9, end: 18 }
): Promise<{ startTime: Date; endTime: Date }[]> => {
  const dayStart = new Date(date);
  dayStart.setUTCHours(workingHours.start, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(workingHours.end, 0, 0, 0);
  
  // 获取当天所有占用
  const bookings = await prisma.venueBooking.findMany({
    where: {
      venueId,
      status: 'CONFIRMED',
      isDeleted: false,
      OR: [
        { startTime: { gte: dayStart, lt: dayEnd } },
        { endTime: { gt: dayStart, lte: dayEnd } },
        { AND: [{ startTime: { lte: dayStart } }, { endTime: { gte: dayEnd } }] },
      ],
    },
    orderBy: { startTime: 'asc' },
  });
  
  const meetings = await prisma.meeting.findMany({
    where: {
      venueId,
      status: 'SCHEDULED',
      isDeleted: false,
      OR: [
        { startTime: { gte: dayStart, lt: dayEnd } },
        { endTime: { gt: dayStart, lte: dayEnd } },
        { AND: [{ startTime: { lte: dayStart } }, { endTime: { gte: dayEnd } }] },
      ],
    },
    orderBy: { startTime: 'asc' },
  });
  
  // 合并所有占用时间
  const occupied = [
    ...bookings.map(b => ({ start: b.startTime, end: b.endTime })),
    ...meetings.map(m => ({ start: m.startTime, end: m.endTime })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // 计算可用时间段
  const available: { startTime: Date; endTime: Date }[] = [];
  let currentStart = dayStart;
  
  for (const slot of occupied) {
    if (slot.start > currentStart) {
      available.push({
        startTime: new Date(currentStart),
        endTime: new Date(Math.min(slot.start.getTime(), dayEnd.getTime())),
      });
    }
    currentStart = new Date(Math.max(currentStart.getTime(), slot.end.getTime()));
  }
  
  // 添加最后一段
  if (currentStart < dayEnd) {
    available.push({
      startTime: new Date(currentStart),
      endTime: new Date(dayEnd),
    });
  }
  
  return available;
};

/**
 * 格式化冲突信息为用户友好的消息
 */
export const formatConflictMessage = (conflicts: ConflictDetail[]): string => {
  if (conflicts.length === 0) {
    return '';
  }
  
  const messages = conflicts.map(c => {
    const typeLabel = c.type === 'BOOKING' ? '场地预约' : '会议';
    const timeStr = `${formatTime(c.startTime)} - ${formatTime(c.endTime)}`;
    return `${typeLabel}「${c.title}」(${timeStr}${c.ownerName ? `, ${c.ownerName}` : ''})`;
  });
  
  return `与以下安排时间冲突：${messages.join('；')}`;
};

/**
 * 格式化时间
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};






