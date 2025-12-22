/**
 * 价值记录服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD: 管理员记录项目创造的价值
 * PRD 6.8.5: 元征平台价值曲线
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ErrorCodes } from '../../utils/errors.js';
import { notDeleted } from '../../utils/softDelete.js';
import { 
  parsePaginationParams, 
  buildPaginatedResult,
  type PaginatedResult 
} from '../../utils/pagination.js';
import { parseSortToPrisma } from '../../utils/sorting.js';
import { createAuditLog } from '../../utils/audit.js';
import { ProjectEventType } from '@prisma/client';
import type {
  CreateValueRecordDto,
  UpdateValueRecordDto,
  ListValueRecordsQueryDto,
  ValueRecordListItem,
  ValueStats,
} from './value-record.dto.js';

/**
 * 创建价值记录
 */
export const createValueRecord = async (
  dto: CreateValueRecordDto,
  adminId: string
): Promise<ValueRecordListItem> => {
  // 如果关联项目，验证项目存在
  let projectName: string | null = null;
  if (dto.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: dto.projectId, ...notDeleted },
      select: { name: true },
    });
    if (!project) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
    }
    projectName = project.name;
  }

  const record = await prisma.$transaction(async (tx) => {
    const newRecord = await tx.valueRecord.create({
      data: {
        projectId: dto.projectId,
        amount: dto.amount,
        description: dto.description,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
    });

    // 如果关联项目，创建 ProjectEvent
    if (dto.projectId) {
      await tx.projectEvent.create({
        data: {
          projectId: dto.projectId,
          eventType: ProjectEventType.PROJECT_VALUE_RECORDED,
          title: `记录项目价值`,
          description: `金额：${dto.amount.toLocaleString()} 元`,
          payload: {
            valueRecordId: newRecord.id,
            amount: dto.amount,
          },
          createdById: adminId,
        },
      });
    }

    return newRecord;
  });

  await createAuditLog({
    userId: adminId,
    action: 'CREATE',
    objectType: 'VALUE_RECORD',
    objectId: record.id,
    summary: `创建价值记录：${dto.amount.toLocaleString()} 元`,
    metadata: { projectId: dto.projectId, amount: dto.amount },
  });

  logger.info({ recordId: record.id, adminId, amount: dto.amount }, '价值记录创建成功');

  return {
    id: record.id,
    projectId: record.projectId,
    projectName,
    amount: Number(record.amount),
    description: record.description,
    recordedAt: record.recordedAt,
    createdAt: record.createdAt,
  };
};

/**
 * 获取价值记录列表
 */
export const listValueRecords = async (
  query: ListValueRecordsQueryDto
): Promise<PaginatedResult<ValueRecordListItem>> => {
  const pagination = parsePaginationParams(query);
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  
  const where: any = {};

  if (query.projectId) {
    where.projectId = query.projectId;
  }

  if (query.startDate) {
    where.recordedAt = { ...where.recordedAt, gte: new Date(query.startDate) };
  }

  if (query.endDate) {
    where.recordedAt = { ...where.recordedAt, lte: new Date(query.endDate) };
  }

  const orderBy = parseSortToPrisma(query.sort, {
    recordedAt: 'desc',
  });

  const [records, total] = await Promise.all([
    prisma.valueRecord.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.valueRecord.count({ where }),
  ]);

  const items: ValueRecordListItem[] = records.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectName: r.project?.name || null,
    amount: Number(r.amount),
    description: r.description,
    recordedAt: r.recordedAt,
    createdAt: r.createdAt,
  }));

  return buildPaginatedResult(items, page, pageSize, total);
};

/**
 * 获取价值记录详情
 */
export const getValueRecordById = async (
  recordId: string
): Promise<ValueRecordListItem> => {
  const record = await prisma.valueRecord.findUnique({
    where: { id: recordId },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  if (!record) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '价值记录不存在');
  }

  return {
    id: record.id,
    projectId: record.projectId,
    projectName: record.project?.name || null,
    amount: Number(record.amount),
    description: record.description,
    recordedAt: record.recordedAt,
    createdAt: record.createdAt,
  };
};

/**
 * 更新价值记录
 */
export const updateValueRecord = async (
  recordId: string,
  dto: UpdateValueRecordDto,
  adminId: string
): Promise<ValueRecordListItem> => {
  const record = await prisma.valueRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '价值记录不存在');
  }

  const updated = await prisma.valueRecord.update({
    where: { id: recordId },
    data: {
      amount: dto.amount,
      description: dto.description,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    userId: adminId,
    action: 'UPDATE',
    objectType: 'VALUE_RECORD',
    objectId: recordId,
    summary: '更新价值记录',
    metadata: { oldAmount: Number(record.amount), newAmount: dto.amount },
  });

  logger.info({ recordId, adminId }, '价值记录更新成功');

  return {
    id: updated.id,
    projectId: updated.projectId,
    projectName: updated.project?.name || null,
    amount: Number(updated.amount),
    description: updated.description,
    recordedAt: updated.recordedAt,
    createdAt: updated.createdAt,
  };
};

/**
 * 删除价值记录
 */
export const deleteValueRecord = async (
  recordId: string,
  adminId: string
): Promise<{ success: boolean }> => {
  const record = await prisma.valueRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '价值记录不存在');
  }

  await prisma.valueRecord.delete({
    where: { id: recordId },
  });

  await createAuditLog({
    userId: adminId,
    action: 'DELETE',
    objectType: 'VALUE_RECORD',
    objectId: recordId,
    summary: `删除价值记录：${Number(record.amount).toLocaleString()} 元`,
    metadata: { amount: Number(record.amount) },
  });

  logger.info({ recordId, adminId }, '价值记录删除成功');

  return { success: true };
};

/**
 * 获取价值统计（用于仪表盘价值曲线）
 */
export const getValueStats = async (): Promise<ValueStats> => {
  const records = await prisma.valueRecord.findMany({
    orderBy: { recordedAt: 'asc' },
  });

  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const recordCount = records.length;

  // 按月聚合
  const byMonthMap = new Map<string, number>();
  for (const record of records) {
    const month = record.recordedAt.toISOString().slice(0, 7); // YYYY-MM
    byMonthMap.set(month, (byMonthMap.get(month) || 0) + Number(record.amount));
  }

  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalAmount,
    recordCount,
    byMonth,
  };
};

