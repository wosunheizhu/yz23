/**
 * 场地管理 Service - Node 5
 * PRD 19.4: 场地与会议室（Venue）基础能力
 */

import { prisma } from '../../utils/db.js';
import { BusinessError, ERROR_CODES } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/audit.js';
import type {
  CreateVenueInput,
  UpdateVenueInput,
  ListVenuesQuery,
  VenueResponse,
  VenueListResponse,
  VenueStatsResponse,
} from './venue.dto.js';

// ================================
// 场地 CRUD
// ================================

/**
 * 创建场地（仅管理员）
 */
export const createVenue = async (
  input: CreateVenueInput,
  adminUserId: string
): Promise<VenueResponse> => {
  // 检查名称是否已存在
  const existing = await prisma.venue.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      `场地名称 "${input.name}" 已存在`
    );
  }

  const venue = await prisma.venue.create({
    data: {
      name: input.name,
      address: input.address,
      capacity: input.capacity,
      supportsMeal: input.supportsMeal,
      note: input.note,
      status: 'ACTIVE',
    },
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'VENUE_CREATED',
    objectType: 'VENUE',
    objectId: venue.id,
    summary: `创建场地: ${venue.name}`,
  });

  return formatVenueResponse(venue);
};

/**
 * 获取场地列表
 */
export const listVenues = async (
  query: ListVenuesQuery
): Promise<VenueListResponse> => {
  const { status, supportsMeal, search, page, pageSize } = query;

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (supportsMeal !== undefined) {
    where.supportsMeal = supportsMeal;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [venues, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venue.count({ where }),
  ]);

  return {
    data: venues.map(formatVenueResponse),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取单个场地
 */
export const getVenueById = async (venueId: string): Promise<VenueResponse> => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });

  if (!venue) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '场地不存在'
    );
  }

  return formatVenueResponse(venue);
};

/**
 * 更新场地（仅管理员）
 */
export const updateVenue = async (
  venueId: string,
  input: UpdateVenueInput,
  adminUserId: string
): Promise<VenueResponse> => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });

  if (!venue) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '场地不存在'
    );
  }

  // 如果更新名称，检查是否重复
  if (input.name && input.name !== venue.name) {
    const existing = await prisma.venue.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new BusinessError(
        ERROR_CODES.VALIDATION_ERROR.code,
        `场地名称 "${input.name}" 已存在`
      );
    }
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.supportsMeal !== undefined && { supportsMeal: input.supportsMeal }),
      ...(input.note !== undefined && { note: input.note }),
    },
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'VENUE_UPDATED',
    objectType: 'VENUE',
    objectId: venue.id,
    summary: `更新场地: ${venue.name}`,
    metadata: { changes: input },
  });

  return formatVenueResponse(updated);
};

/**
 * 停用场地（仅管理员）
 * PRD 19.4.3: Venue 被 DISABLED 后：不可创建新事件；历史事件照常展示
 */
export const disableVenue = async (
  venueId: string,
  adminUserId: string
): Promise<VenueResponse> => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
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
      '场地已处于停用状态'
    );
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: { status: 'DISABLED' },
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'VENUE_DISABLED',
    objectType: 'VENUE',
    objectId: venue.id,
    summary: `停用场地: ${venue.name}`,
  });

  return formatVenueResponse(updated);
};

/**
 * 启用场地（仅管理员）
 */
export const enableVenue = async (
  venueId: string,
  adminUserId: string
): Promise<VenueResponse> => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });

  if (!venue) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '场地不存在'
    );
  }

  if (venue.status === 'ACTIVE') {
    throw new BusinessError(
      ERROR_CODES.VALIDATION_ERROR.code,
      '场地已处于可用状态'
    );
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: { status: 'ACTIVE' },
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'VENUE_ENABLED',
    objectType: 'VENUE',
    objectId: venue.id,
    summary: `启用场地: ${venue.name}`,
  });

  return formatVenueResponse(updated);
};

/**
 * 设置场地为维护状态（仅管理员）
 */
export const setVenueMaintenance = async (
  venueId: string,
  adminUserId: string
): Promise<VenueResponse> => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });

  if (!venue) {
    throw new BusinessError(
      ERROR_CODES.RESOURCE_NOT_FOUND.code,
      '场地不存在'
    );
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: { status: 'MAINTENANCE' },
  });

  // 审计日志
  await createAuditLog({
    userId: adminUserId,
    action: 'VENUE_MAINTENANCE',
    objectType: 'VENUE',
    objectId: venue.id,
    summary: `场地进入维护状态: ${venue.name}`,
  });

  return formatVenueResponse(updated);
};

/**
 * 获取场地统计信息（仅管理员）
 */
export const getVenueStats = async (): Promise<VenueStatsResponse> => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalVenues,
    activeVenues,
    maintenanceVenues,
    disabledVenues,
    bookingsThisWeek,
    bookingsThisMonth,
  ] = await Promise.all([
    prisma.venue.count(),
    prisma.venue.count({ where: { status: 'ACTIVE' } }),
    prisma.venue.count({ where: { status: 'MAINTENANCE' } }),
    prisma.venue.count({ where: { status: 'DISABLED' } }),
    prisma.venueBooking.count({
      where: {
        startTime: { gte: weekStart },
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
    }),
    prisma.venueBooking.count({
      where: {
        startTime: { gte: monthStart },
        status: { not: 'CANCELLED' },
        isDeleted: false,
      },
    }),
  ]);

  return {
    totalVenues,
    activeVenues,
    maintenanceVenues,
    disabledVenues,
    bookingsThisWeek,
    bookingsThisMonth,
  };
};

/**
 * 获取可用场地列表（用于预约/会议）
 * 只返回 ACTIVE 状态的场地
 */
export const getActiveVenues = async (): Promise<VenueResponse[]> => {
  const venues = await prisma.venue.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { name: 'asc' },
  });

  return venues.map(formatVenueResponse);
};

// ================================
// 辅助函数
// ================================

function formatVenueResponse(venue: {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  supportsMeal: boolean;
  note: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): VenueResponse {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    capacity: venue.capacity,
    supportsMeal: venue.supportsMeal,
    note: venue.note,
    status: venue.status as VenueResponse['status'],
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt,
  };
}






