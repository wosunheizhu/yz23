/**
 * 投票服务 - Node 10
 * PRD 17.3: 投票模块
 */

import { prisma } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { createAuditLog } from '../../utils/audit.js';
import { sendNotification } from '../../utils/notification.js';
import { ensureHigherRolesIncluded, buildVisibilityFilter } from '../../utils/visibility.js';
import type {
  CreateVoteInput,
  UpdateVoteInput,
  ListVotesQuery,
  VoteResponse,
  VoteDetailResponse,
  VoteListResponse,
  CastVoteInput,
  VoteOption,
} from './vote.dto.js';

const notDeleted = { isDeleted: false };

// ================================
// 创建投票
// ================================

/**
 * 发起投票
 * PRD 17.3: 投票
 */
export const createVote = async (
  input: CreateVoteInput,
  userId: string,
  userRoleLevel: number = 1
): Promise<VoteResponse> => {
  const {
    title,
    description,
    options,
    passRule,
    deadline,
    allowAbstain,
    isAnonymous,
    visibilityScopeType,
    visibilityMinRoleLevel,
    visibilityUserIds,
    note,
  } = input;

  // PRD 31.3: CUSTOM 保存时后端强制合并高层用户
  const finalVisibilityUserIds = await ensureHigherRolesIncluded(
    visibilityScopeType || 'ALL',
    userRoleLevel,
    visibilityUserIds || []
  );

  const vote = await prisma.vote.create({
    data: {
      creatorId: userId,
      title,
      description,
      options: options as any,
      passRule,
      deadline: new Date(deadline),
      allowAbstain,
      isAnonymous,
      status: 'OPEN',
      visibilityScopeType: visibilityScopeType as any,
      visibilityMinRoleLevel,
      visibilityUserIds: finalVisibilityUserIds,
      note,
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
  });

  await createAuditLog({
    userId,
    action: 'CREATE',
    objectType: 'VOTE',
    objectId: vote.id,
    summary: `发起投票: ${title}`,
    metadata: { deadline, optionsCount: options.length },
  });

  logger.info({ voteId: vote.id, userId }, '投票已发起');

  // 发送通知给可见用户
  await sendNotification({
    eventType: 'VOTE_CREATED',
    actorId: userId,
    targetUserIds: visibilityUserIds || [],
    title: '新投票',
    content: `有新的投票需要您参与: ${title}`,
    relatedObjectType: 'VOTE',
    relatedObjectId: vote.id,
    channels: ['INBOX', 'EMAIL'],
    visibilityScopeType,
    visibilityMinRoleLevel,
  });

  return formatVote(vote, userId);
};

// ================================
// 获取投票列表
// ================================

export const listVotes = async (
  query: ListVotesQuery,
  currentUserId: string,
  currentRoleLevel: number
): Promise<VoteListResponse> => {
  const { status, creatorId, page, pageSize } = query;

  const where: Record<string, unknown> = { ...notDeleted };

  // 可见性过滤
  where.OR = [
    { visibilityScopeType: 'ALL' },
    {
      visibilityScopeType: 'ROLE_MIN_LEVEL',
      visibilityMinRoleLevel: { lte: currentRoleLevel },
    },
    {
      visibilityScopeType: 'CUSTOM',
      visibilityUserIds: { has: currentUserId },
    },
    { creatorId: currentUserId },
  ];

  if (status) where.status = status;
  if (creatorId) where.creatorId = creatorId;

  const [items, total] = await Promise.all([
    prisma.vote.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { records: true } },
        records: { where: { userId: currentUserId }, select: { option: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vote.count({ where }),
  ]);

  return {
    data: items.map((vote) => formatVote(vote, currentUserId)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ================================
// 获取投票详情
// ================================

export const getVoteById = async (
  id: string,
  currentUserId: string
): Promise<VoteDetailResponse | null> => {
  const vote = await prisma.vote.findFirst({
    where: { id, ...notDeleted },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { records: true } },
      records: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!vote) return null;

  const myRecord = vote.records.find((r) => r.userId === currentUserId);

  // 统计结果
  const results: Record<string, number> = {};
  const options = vote.options as VoteOption[];
  options.forEach((opt) => {
    results[opt.key] = 0;
  });
  if (vote.allowAbstain) {
    results['ABSTAIN'] = 0;
  }
  vote.records.forEach((r) => {
    results[r.option] = (results[r.option] || 0) + 1;
  });

  // 非匿名投票显示投票者
  const voters = vote.isAnonymous
    ? undefined
    : vote.records.map((r) => ({
        userId: r.userId,
        userName: r.user.name,
        option: r.option,
      }));

  return {
    ...formatVote(vote, currentUserId),
    myVote: myRecord?.option || null,
    results,
    voters,
  };
};

// ================================
// 投票
// ================================

export const castVote = async (
  voteId: string,
  input: CastVoteInput,
  userId: string
): Promise<void> => {
  const vote = await prisma.vote.findFirst({
    where: { id: voteId, ...notDeleted },
  });

  if (!vote) {
    throw new Error('投票不存在');
  }

  if (vote.status !== 'OPEN') {
    throw new Error('投票已关闭');
  }

  if (new Date() > vote.deadline) {
    throw new Error('投票已截止');
  }

  // 检查选项有效性
  const options = vote.options as VoteOption[];
  const validOptions = options.map((o) => o.key);
  if (vote.allowAbstain) validOptions.push('ABSTAIN');

  if (!validOptions.includes(input.option)) {
    throw new Error('无效的投票选项');
  }

  // 检查是否已投票
  const existing = await prisma.voteRecord.findUnique({
    where: { voteId_userId: { voteId, userId } },
  });

  if (existing) {
    throw new Error('您已经投过票了');
  }

  await prisma.voteRecord.create({
    data: {
      voteId,
      userId,
      option: input.option,
    },
  });

  logger.info({ voteId, userId, option: input.option }, '投票已提交');
};

// ================================
// 关闭投票
// ================================

export const closeVote = async (
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<VoteDetailResponse> => {
  const vote = await prisma.vote.findFirst({
    where: { id, ...notDeleted },
    include: { creator: { select: { id: true, name: true } } },
  });

  if (!vote) {
    throw new Error('投票不存在');
  }

  if (vote.creatorId !== userId && !isAdmin) {
    throw new Error('只有创建者或管理员可以关闭投票');
  }

  const updated = await prisma.vote.update({
    where: { id },
    data: { status: 'CLOSED' },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { records: true } },
      records: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  await createAuditLog({
    userId,
    action: 'CLOSE',
    objectType: 'VOTE',
    objectId: id,
    summary: `关闭投票: ${vote.title}`,
  });

  // 发送结果通知
  await sendNotification({
    eventType: 'VOTE_CLOSED',
    actorId: userId,
    targetUserIds: updated.records.map((r) => r.userId),
    title: '投票已结束',
    content: `投票"${vote.title}"已结束，请查看结果`,
    relatedObjectType: 'VOTE',
    relatedObjectId: id,
    channels: ['INBOX'],
  });

  // 构建结果
  const results: Record<string, number> = {};
  const options = updated.options as VoteOption[];
  options.forEach((opt) => {
    results[opt.key] = 0;
  });
  if (updated.allowAbstain) {
    results['ABSTAIN'] = 0;
  }
  updated.records.forEach((r) => {
    results[r.option] = (results[r.option] || 0) + 1;
  });

  const myRecord = updated.records.find((r) => r.userId === userId);

  return {
    ...formatVote(updated, userId),
    myVote: myRecord?.option || null,
    results,
    voters: updated.isAnonymous
      ? undefined
      : updated.records.map((r) => ({
          userId: r.userId,
          userName: r.user.name,
          option: r.option,
        })),
  };
};

// ================================
// 取消投票
// ================================

export const cancelVote = async (
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const vote = await prisma.vote.findFirst({
    where: { id, ...notDeleted },
  });

  if (!vote) {
    throw new Error('投票不存在');
  }

  if (vote.creatorId !== userId && !isAdmin) {
    throw new Error('只有创建者或管理员可以取消投票');
  }

  await prisma.vote.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await createAuditLog({
    userId,
    action: 'CANCEL',
    objectType: 'VOTE',
    objectId: id,
    summary: `取消投票: ${vote.title}`,
  });

  logger.info({ voteId: id, userId }, '投票已取消');
};

// ================================
// 更新投票
// ================================

export const updateVote = async (
  id: string,
  input: UpdateVoteInput,
  userId: string
): Promise<VoteResponse> => {
  const vote = await prisma.vote.findFirst({
    where: { id, ...notDeleted },
  });

  if (!vote) {
    throw new Error('投票不存在');
  }

  if (vote.creatorId !== userId) {
    throw new Error('只有创建者可以编辑投票');
  }

  if (vote.status !== 'OPEN') {
    throw new Error('只能编辑进行中的投票');
  }

  const updated = await prisma.vote.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description && { description: input.description }),
      ...(input.deadline && { deadline: new Date(input.deadline) }),
      ...(input.note !== undefined && { note: input.note }),
    },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
  });

  return formatVote(updated, userId);
};

// ================================
// 辅助函数
// ================================

const formatVote = (vote: any, currentUserId: string): VoteResponse => ({
  id: vote.id,
  creatorId: vote.creatorId,
  creatorName: vote.creator.name,
  title: vote.title,
  description: vote.description,
  options: vote.options as VoteOption[],
  passRule: vote.passRule,
  deadline: vote.deadline.toISOString(),
  allowAbstain: vote.allowAbstain,
  isAnonymous: vote.isAnonymous,
  status: vote.status,
  visibilityScopeType: vote.visibilityScopeType,
  note: vote.note,
  totalVotes: vote._count?.records || 0,
  myVote: vote.records?.find((r: any) => r.userId === currentUserId)?.option || null,
  createdAt: vote.createdAt.toISOString(),
  updatedAt: vote.updatedAt.toISOString(),
});

