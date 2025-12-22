/**
 * 本地标签/备注服务
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.5 / 6.1.5: 本地标签 & 备注（仅自己可见）
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ErrorCodes } from '../../utils/errors.js';
import type { UserNoteDto } from './user.dto.js';

/**
 * 本地笔记响应类型
 */
export interface LocalNoteResponse {
  id: string;
  targetUserId: string;
  targetUserName: string;
  tags: string[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取用户对某人的本地标签/备注
 */
export const getLocalNote = async (
  ownerId: string,
  targetUserId: string
): Promise<LocalNoteResponse | null> => {
  const note = await prisma.localNote.findUnique({
    where: {
      ownerId_targetUserId: {
        ownerId,
        targetUserId,
      },
    },
    include: {
      targetUser: {
        select: { name: true },
      },
    },
  });

  if (!note) {
    return null;
  }

  return {
    id: note.id,
    targetUserId: note.targetUserId,
    targetUserName: note.targetUser.name,
    tags: note.tags,
    note: note.note,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
};

/**
 * 创建或更新本地标签/备注
 */
export const upsertLocalNote = async (
  ownerId: string,
  dto: UserNoteDto
): Promise<LocalNoteResponse> => {
  const { targetUserId, note, tags } = dto;

  // 验证目标用户存在
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, isDeleted: false },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    throw new NotFoundError(ErrorCodes.USER_NOT_FOUND, '目标用户不存在');
  }

  // 使用 upsert 确保幂等性
  const result = await prisma.localNote.upsert({
    where: {
      ownerId_targetUserId: {
        ownerId,
        targetUserId,
      },
    },
    update: {
      tags: tags ?? [],
      note: note ?? null,
    },
    create: {
      ownerId,
      targetUserId,
      tags: tags ?? [],
      note: note ?? null,
    },
    include: {
      targetUser: {
        select: { name: true },
      },
    },
  });

  logger.info({ ownerId, targetUserId }, '更新本地标签/备注');

  return {
    id: result.id,
    targetUserId: result.targetUserId,
    targetUserName: result.targetUser.name,
    tags: result.tags,
    note: result.note,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
};

/**
 * 删除本地标签/备注
 */
export const deleteLocalNote = async (
  ownerId: string,
  targetUserId: string
): Promise<void> => {
  const note = await prisma.localNote.findUnique({
    where: {
      ownerId_targetUserId: {
        ownerId,
        targetUserId,
      },
    },
  });

  if (!note) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '本地备注不存在');
  }

  await prisma.localNote.delete({
    where: {
      ownerId_targetUserId: {
        ownerId,
        targetUserId,
      },
    },
  });

  logger.info({ ownerId, targetUserId }, '删除本地标签/备注');
};

/**
 * 获取用户的所有本地标签/备注
 */
export const listLocalNotes = async (
  ownerId: string
): Promise<LocalNoteResponse[]> => {
  const notes = await prisma.localNote.findMany({
    where: { ownerId },
    include: {
      targetUser: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return notes.map((note) => ({
    id: note.id,
    targetUserId: note.targetUserId,
    targetUserName: note.targetUser.name,
    tags: note.tags,
    note: note.note,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
};

/**
 * 获取用户的所有本地标签（用于筛选）
 */
export const getMyLocalTags = async (ownerId: string): Promise<string[]> => {
  const notes = await prisma.localNote.findMany({
    where: { ownerId },
    select: { tags: true },
  });

  const allTags = new Set<string>();
  notes.forEach((n) => n.tags.forEach((t) => allTags.add(t)));

  return Array.from(allTags).sort();
};






