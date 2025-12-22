/**
 * Token 模块 Service
 * Node 3: Token 账本
 * 
 * PRD 验收标准:
 * - 初始额度、不可透支
 * - 交易状态流转：待管理员审核 → 待收款确认 → 完成/拒绝/取消
 * - 管理员赠与/扣除、项目分红交易
 * - 账本严肃：交易不可物理删除
 * - 并发测试：同一笔交易重复确认不重复扣款（幂等）
 * - 余额不为负的约束测试
 */
import { Prisma, TokenTransaction } from '@prisma/client';
import { prisma } from '../../utils/db.js';
import { AppError, BadRequestError, NotFoundError, ForbiddenError, ErrorCodes } from '../../utils/errors.js';
import { sendNotification } from '../../utils/notification.js';
import {
  CreateTransferDto,
  AdminReviewTransferDto,
  ReceiverConfirmDto,
  AdminGrantDto,
  AdminDeductDto,
  DistributeDividendDto,
  CancelTransferDto,
  ListTransactionsQueryDto,
  ListPendingTransactionsQueryDto,
  ListPendingConfirmQueryDto,
  ListAllAccountsQueryDto,
  GlobalTokenStatsQueryDto,
  AdminListUserTransactionsQueryDto,
  AdminListAllTransactionsQueryDto,
  TokenTransactionDirection,
  TokenTransactionStatus,
  TokenTransactionResponse,
  TokenAccountResponse,
  TokenStatsResponse,
  TransactionListResponse,
  UserTokenAccountResponse,
  AccountListResponse,
  GlobalTokenStatsResponse,
  ProjectTokenStatsResponse,
} from './token.dto.js';

// ================================
// 辅助函数
// ================================

/**
 * 将 Prisma Decimal 转换为 number
 */
const decimalToNumber = (decimal: Prisma.Decimal | null): number => {
  return decimal ? parseFloat(decimal.toString()) : 0;
};

/**
 * 格式化交易响应
 */
const formatTransaction = (
  tx: TokenTransaction & {
    fromUser?: { name: string } | null;
    toUser?: { name: string } | null;
    adminUser?: { name: string } | null;
    relatedProject?: { name: string } | null;
  }
): TokenTransactionResponse => ({
  id: tx.id,
  fromUserId: tx.fromUserId,
  fromUserName: tx.fromUser?.name,
  toUserId: tx.toUserId,
  toUserName: tx.toUser?.name,
  amount: decimalToNumber(tx.amount),
  direction: tx.direction as TokenTransactionDirection,
  status: tx.status as TokenTransactionStatus,
  reason: tx.reason,
  adminComment: tx.adminComment,
  adminUserId: tx.adminUserId,
  adminUserName: tx.adminUser?.name,
  relatedProjectId: tx.relatedProjectId,
  relatedProjectName: tx.relatedProject?.name,
  relatedMeetingId: tx.relatedMeetingId,
  relatedGuestId: tx.relatedGuestId,
  createdAt: tx.createdAt.toISOString(),
  updatedAt: tx.updatedAt.toISOString(),
  completedAt: tx.completedAt?.toISOString() || null,
});

// ================================
// 查询功能
// ================================

/**
 * 获取用户 Token 账户
 * 可用余额 = 账户余额 - 待审核转出金额（冻结中）
 */
export const getTokenAccount = async (userId: string): Promise<TokenAccountResponse> => {
  const [account, pendingOutgoing] = await Promise.all([
    prisma.tokenAccount.findUnique({
      where: { userId },
    }),
    // 查询用户发起的待审核转账总额（冻结金额）
    prisma.tokenTransaction.aggregate({
      where: {
        fromUserId: userId,
        status: 'PENDING_ADMIN_APPROVAL',
        direction: 'TRANSFER',
      },
      _sum: { amount: true },
    }),
  ]);

  if (!account) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Token 账户不存在');
  }

  const balance = decimalToNumber(account.balance);
  const frozenAmount = decimalToNumber(pendingOutgoing._sum.amount);
  const availableBalance = balance - frozenAmount;

  return {
    id: account.id,
    userId: account.userId,
    balance,
    frozenAmount,
    availableBalance,
    initialAmount: decimalToNumber(account.initialAmount),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
};

/**
 * 获取用户交易列表
 */
export const listUserTransactions = async (
  userId: string,
  query: ListTransactionsQueryDto
): Promise<TransactionListResponse> => {
  const { page, pageSize, direction, status, relatedProjectId, startDate, endDate, sortBy, sortOrder } = query;

  const where: Prisma.TokenTransactionWhereInput = {
    OR: [{ fromUserId: userId }, { toUserId: userId }],
    ...(direction && { direction }),
    ...(status && { status }),
    ...(relatedProjectId && { relatedProjectId }),
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
  };

  const [items, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return {
    items: items.map(formatTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * 获取交易详情
 */
export const getTransaction = async (
  transactionId: string,
  userId: string,
  isAdmin: boolean
): Promise<TokenTransactionResponse> => {
  const tx = await prisma.tokenTransaction.findUnique({
    where: { id: transactionId },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      adminUser: { select: { name: true } },
      relatedProject: { select: { name: true } },
    },
  });

  if (!tx) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '交易不存在');
  }

  // 权限检查：管理员或交易相关方可查看
  if (!isAdmin && tx.fromUserId !== userId && tx.toUserId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '无权查看此交易');
  }

  return formatTransaction(tx);
};

/**
 * 获取用户 Token 统计
 */
export const getTokenStats = async (userId: string): Promise<TokenStatsResponse> => {
  const [received, sent, granted, deducted, dividend] = await Promise.all([
    // 收到的转账
    prisma.tokenTransaction.aggregate({
      where: { toUserId: userId, direction: 'TRANSFER', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 发出的转账
    prisma.tokenTransaction.aggregate({
      where: { fromUserId: userId, direction: 'TRANSFER', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 管理员赠与
    prisma.tokenTransaction.aggregate({
      where: { toUserId: userId, direction: 'ADMIN_GRANT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 管理员扣除
    prisma.tokenTransaction.aggregate({
      where: { fromUserId: userId, direction: 'ADMIN_DEDUCT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 分红
    prisma.tokenTransaction.aggregate({
      where: { toUserId: userId, direction: 'DIVIDEND', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);

  const totalReceived = decimalToNumber(received._sum.amount);
  const totalSent = decimalToNumber(sent._sum.amount);
  const totalGranted = decimalToNumber(granted._sum.amount);
  const totalDeducted = decimalToNumber(deducted._sum.amount);
  const totalDividend = decimalToNumber(dividend._sum.amount);
  const netChange = totalReceived + totalGranted + totalDividend - totalSent - totalDeducted;

  return {
    totalReceived,
    totalSent,
    totalGranted,
    totalDeducted,
    totalDividend,
    netChange,
  };
};

// ================================
// 转账功能 (PRD 15.1)
// ================================

/**
 * 发起转账
 * 状态：PENDING_ADMIN_APPROVAL（待管理员审核）
 */
export const createTransfer = async (
  fromUserId: string,
  dto: CreateTransferDto
): Promise<TokenTransactionResponse> => {
  const { toUserId, amount, reason, relatedProjectId } = dto;

  // 1. 不能转账给自己
  if (fromUserId === toUserId) {
    throw new BadRequestError(ErrorCodes.VALIDATION_ERROR, '不能转账给自己');
  }

  // 2. 检查收款人存在
  const toUser = await prisma.user.findUnique({
    where: { id: toUserId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!toUser) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '收款人不存在');
  }

  // 3. 检查发起人余额（不可透支）
  const fromAccount = await prisma.tokenAccount.findUnique({
    where: { userId: fromUserId },
  });
  if (!fromAccount) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '发起人 Token 账户不存在');
  }
  if (decimalToNumber(fromAccount.balance) < amount) {
    throw new BadRequestError(ErrorCodes.TOKEN_INSUFFICIENT, 'Token 余额不足，不可透支');
  }

  // 4. 检查关联项目（如有）- 项目待审核/废弃期间禁止 Token 交易
  if (relatedProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: relatedProjectId, isDeleted: false },
      select: { id: true, reviewStatus: true, businessStatus: true },
    });
    if (!project) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '关联项目不存在');
    }
    if (project.reviewStatus === 'PENDING_REVIEW') {
      throw new BadRequestError(
        ErrorCodes.PROJECT_PENDING_REVIEW,
        '项目待审核期间不能进行 Token 交易'
      );
    }
    // PRD: 废弃项目禁止 Token 操作
    if (project.businessStatus === 'ABANDONED') {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_ERROR,
        '废弃项目不能进行 Token 交易'
      );
    }
  }

  // 5. 创建交易记录（待管理员审核）
  const tx = await prisma.tokenTransaction.create({
    data: {
      fromUserId,
      toUserId,
      amount: new Prisma.Decimal(amount),
      direction: 'TRANSFER',
      status: 'PENDING_ADMIN_APPROVAL',
      reason,
      relatedProjectId,
    },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      relatedProject: { select: { name: true } },
    },
  });

  // 6. 发送通知给管理员
  const admins = await prisma.user.findMany({
    where: { isAdmin: true, isDeleted: false },
    select: { id: true },
  });
  for (const admin of admins) {
    await sendNotification({
      type: 'TOKEN_PENDING_APPROVAL',
      recipientId: admin.id,
      actorId: fromUserId,
      objectType: 'TokenTransaction',
      objectId: tx.id,
      title: 'Token 转账待审核',
      content: `有一笔 ${amount} Token 转账申请待审核`,
    });
  }

  return formatTransaction(tx);
};

/**
 * 管理员审核转账
 * 通过：状态变为 PENDING_RECEIVER_CONFIRM
 * 拒绝：状态变为 REJECTED
 */
export const adminReviewTransfer = async (
  transactionId: string,
  adminUserId: string,
  dto: AdminReviewTransferDto
): Promise<TokenTransactionResponse> => {
  const { approve, comment } = dto;

  return await prisma.$transaction(async (tx) => {
    // 1. 获取交易并锁定
    const transaction = await tx.tokenTransaction.findUnique({
      where: { id: transactionId },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '交易不存在');
    }

    // 2. 幂等检查：只有待审核状态可审核
    if (transaction.status !== 'PENDING_ADMIN_APPROVAL') {
      throw new BadRequestError(
        ErrorCodes.TOKEN_TRANSACTION_INVALID_STATE,
        `交易当前状态为 ${transaction.status}，无法审核`
      );
    }

    // 3. 更新交易状态
    const newStatus = approve ? 'PENDING_RECEIVER_CONFIRM' : 'REJECTED';
    const updated = await tx.tokenTransaction.update({
      where: { id: transactionId },
      data: {
        status: newStatus,
        adminUserId,
        adminComment: comment,
        ...((!approve) && { completedAt: new Date() }),
      },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
    });

    // 4. 发送通知
    if (approve && updated.toUserId) {
      // 通知收款人确认
      await sendNotification({
        type: 'TOKEN_PENDING_CONFIRM',
        recipientId: updated.toUserId,
        actorId: adminUserId,
        objectType: 'TokenTransaction',
        objectId: transactionId,
        title: 'Token 转账待您确认',
        content: `您有一笔 ${decimalToNumber(updated.amount)} Token 转账待确认收款`,
      });
    } else if (!approve && updated.fromUserId) {
      // 通知发起人被拒绝
      await sendNotification({
        type: 'TOKEN_REJECTED',
        recipientId: updated.fromUserId,
        actorId: adminUserId,
        objectType: 'TokenTransaction',
        objectId: transactionId,
        title: 'Token 转账被拒绝',
        content: `您的 ${decimalToNumber(updated.amount)} Token 转账申请已被管理员拒绝${comment ? `：${comment}` : ''}`,
      });
    }

    return formatTransaction(updated);
  });
};

/**
 * 收款人确认转账
 * 接受：执行实际转账，状态变为 COMPLETED
 * 拒绝：状态变为 REJECTED
 */
export const receiverConfirm = async (
  transactionId: string,
  receiverUserId: string,
  dto: ReceiverConfirmDto
): Promise<TokenTransactionResponse> => {
  const { accept, comment } = dto;

  return await prisma.$transaction(async (tx) => {
    // 1. 获取交易并锁定
    const transaction = await tx.tokenTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '交易不存在');
    }

    // 2. 权限检查：只有收款人可确认
    if (transaction.toUserId !== receiverUserId) {
      throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有收款人可以确认此交易');
    }

    // 3. 幂等检查：只有待确认状态可确认
    if (transaction.status !== 'PENDING_RECEIVER_CONFIRM') {
      throw new BadRequestError(
        ErrorCodes.TOKEN_TRANSACTION_INVALID_STATE,
        `交易当前状态为 ${transaction.status}，无法确认`
      );
    }

    if (accept) {
      // 4a. 接受：执行实际转账
      const amount = decimalToNumber(transaction.amount);
      const fromUserId = transaction.fromUserId!;

      // 再次检查余额（防止并发问题）
      const fromAccount = await tx.tokenAccount.findUnique({
        where: { userId: fromUserId },
      });
      if (!fromAccount || decimalToNumber(fromAccount.balance) < amount) {
        throw new BadRequestError(ErrorCodes.TOKEN_INSUFFICIENT, '发起人余额不足');
      }

      // 扣减发起人余额
      await tx.tokenAccount.update({
        where: { userId: fromUserId },
        data: { balance: { decrement: amount } },
      });

      // 增加收款人余额
      await tx.tokenAccount.update({
        where: { userId: receiverUserId },
        data: { balance: { increment: amount } },
      });

      // 更新交易状态
      const updated = await tx.tokenTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } },
          adminUser: { select: { name: true } },
          relatedProject: { select: { name: true } },
        },
      });

      // 通知发起人
      if (updated.fromUserId) {
        await sendNotification({
          type: 'TOKEN_COMPLETED',
          recipientId: updated.fromUserId,
          actorId: receiverUserId,
          objectType: 'TokenTransaction',
          objectId: transactionId,
          title: 'Token 转账已完成',
          content: `您向 ${updated.toUser?.name} 的 ${amount} Token 转账已完成`,
        });
      }

      // 如果关联项目，记录到项目时间线 (PRD 6.3.6.5)
      if (updated.relatedProjectId) {
        await tx.projectEvent.create({
          data: {
            projectId: updated.relatedProjectId,
            eventType: 'TOKEN_TRANSFER_COMPLETED',
            title: 'Token 转账完成',
            description: `${updated.fromUser?.name} 向 ${updated.toUser?.name} 转账 ${amount} Token`,
            payload: {
              transactionId: updated.id,
              fromUserId: updated.fromUserId,
              toUserId: updated.toUserId,
              amount,
              reason: updated.reason,
            },
            createdById: receiverUserId,
          },
        });
      }

      return formatTransaction(updated);
    } else {
      // 4b. 拒绝
      const updated = await tx.tokenTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
        },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } },
          adminUser: { select: { name: true } },
          relatedProject: { select: { name: true } },
        },
      });

      // 通知发起人
      if (updated.fromUserId) {
        await sendNotification({
          type: 'TOKEN_REJECTED',
          recipientId: updated.fromUserId,
          actorId: receiverUserId,
          objectType: 'TokenTransaction',
          objectId: transactionId,
          title: 'Token 转账被拒绝',
          content: `收款人拒绝了您的 ${decimalToNumber(updated.amount)} Token 转账${comment ? `：${comment}` : ''}`,
        });
      }

      return formatTransaction(updated);
    }
  });
};

/**
 * 取消转账（发起人在待审核阶段可取消）
 */
export const cancelTransfer = async (
  transactionId: string,
  userId: string,
  dto: CancelTransferDto
): Promise<TokenTransactionResponse> => {
  const transaction = await prisma.tokenTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '交易不存在');
  }

  // 只有发起人可取消
  if (transaction.fromUserId !== userId) {
    throw new ForbiddenError(ErrorCodes.FORBIDDEN, '只有发起人可以取消此交易');
  }

  // 只有待审核状态可取消
  if (transaction.status !== 'PENDING_ADMIN_APPROVAL') {
    throw new BadRequestError(
      ErrorCodes.TOKEN_TRANSACTION_INVALID_STATE,
      '只有待审核状态的交易可以取消'
    );
  }

  const updated = await prisma.tokenTransaction.update({
    where: { id: transactionId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
      adminComment: dto.reason ? `[取消原因] ${dto.reason}` : null,
    },
    include: {
      fromUser: { select: { name: true } },
      toUser: { select: { name: true } },
      adminUser: { select: { name: true } },
      relatedProject: { select: { name: true } },
    },
  });

  return formatTransaction(updated);
};

// ================================
// 管理员赠与/扣除 (PRD 15.1)
// ================================

/**
 * 管理员赠与 Token
 * 直接完成，不需要收款人确认（PRD：管理员赠与直接到账）
 */
export const adminGrant = async (
  adminUserId: string,
  dto: AdminGrantDto
): Promise<TokenTransactionResponse> => {
  const { toUserId, amount, reason, relatedProjectId } = dto;

  return await prisma.$transaction(async (tx) => {
    // 1. 检查收款人存在
    const toUser = await tx.user.findUnique({
      where: { id: toUserId, isDeleted: false },
      select: { id: true, name: true },
    });
    if (!toUser) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '接收人不存在');
    }

    // 2. 增加收款人余额
    const toAccount = await tx.tokenAccount.findUnique({
      where: { userId: toUserId },
    });
    if (!toAccount) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '接收人 Token 账户不存在');
    }
    await tx.tokenAccount.update({
      where: { userId: toUserId },
      data: { balance: { increment: amount } },
    });

    // 3. 创建交易记录（直接完成）
    const transaction = await tx.tokenTransaction.create({
      data: {
        fromUserId: null, // 系统赠与，无发起人
        toUserId,
        amount: new Prisma.Decimal(amount),
        direction: 'ADMIN_GRANT',
        status: 'COMPLETED',
        reason,
        adminUserId,
        relatedProjectId,
        completedAt: new Date(),
      },
      include: {
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
    });

    // 4. 通知接收人
    await sendNotification({
      type: 'TOKEN_GRANTED',
      recipientId: toUserId,
      actorId: adminUserId,
      objectType: 'TokenTransaction',
      objectId: transaction.id,
      title: '收到 Token 赠与',
      content: `管理员已向您赠与 ${amount} Token：${reason}`,
    });

    return formatTransaction(transaction);
  });
};

/**
 * 管理员扣除 Token
 * 直接完成，不需要确认
 */
export const adminDeduct = async (
  adminUserId: string,
  dto: AdminDeductDto
): Promise<TokenTransactionResponse> => {
  const { fromUserId, amount, reason, relatedProjectId } = dto;

  return await prisma.$transaction(async (tx) => {
    // 1. 检查被扣除人存在
    const fromUser = await tx.user.findUnique({
      where: { id: fromUserId, isDeleted: false },
      select: { id: true, name: true },
    });
    if (!fromUser) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '被扣除人不存在');
    }

    // 2. 检查余额
    const fromAccount = await tx.tokenAccount.findUnique({
      where: { userId: fromUserId },
    });
    if (!fromAccount) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '被扣除人 Token 账户不存在');
    }
    if (decimalToNumber(fromAccount.balance) < amount) {
      throw new BadRequestError(ErrorCodes.TOKEN_INSUFFICIENT, '被扣除人余额不足');
    }

    // 3. 扣减余额
    await tx.tokenAccount.update({
      where: { userId: fromUserId },
      data: { balance: { decrement: amount } },
    });

    // 4. 创建交易记录（直接完成）
    const transaction = await tx.tokenTransaction.create({
      data: {
        fromUserId,
        toUserId: null, // 系统扣除，无接收人
        amount: new Prisma.Decimal(amount),
        direction: 'ADMIN_DEDUCT',
        status: 'COMPLETED',
        reason,
        adminUserId,
        relatedProjectId,
        completedAt: new Date(),
      },
      include: {
        fromUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
    });

    // 5. 通知被扣除人
    await sendNotification({
      type: 'TOKEN_DEDUCTED',
      recipientId: fromUserId,
      actorId: adminUserId,
      objectType: 'TokenTransaction',
      objectId: transaction.id,
      title: 'Token 已被扣除',
      content: `管理员已从您的账户扣除 ${amount} Token：${reason}`,
    });

    return formatTransaction(transaction);
  });
};

// ================================
// 项目分红 (PRD 15.1)
// ================================

/**
 * 项目分红
 * 由管理员发起，直接到账各成员
 */
export const distributeDividend = async (
  adminUserId: string,
  dto: DistributeDividendDto
): Promise<TokenTransactionResponse[]> => {
  const { projectId, distributions, reason } = dto;

  return await prisma.$transaction(async (tx) => {
    // 1. 检查项目存在且已审核通过、非废弃状态
    const project = await tx.project.findUnique({
      where: { id: projectId, isDeleted: false },
      select: { id: true, name: true, reviewStatus: true, businessStatus: true },
    });
    if (!project) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, '项目不存在');
    }
    if (project.reviewStatus !== 'APPROVED') {
      throw new BadRequestError(
        ErrorCodes.PROJECT_PENDING_REVIEW,
        '项目未审核通过，无法进行分红'
      );
    }
    // PRD: 废弃项目禁止 Token 操作
    if (project.businessStatus === 'ABANDONED') {
      throw new BadRequestError(
        ErrorCodes.VALIDATION_ERROR,
        '废弃项目不能进行 Token 分红'
      );
    }

    const transactions: TokenTransactionResponse[] = [];

    // 2. 为每个分红接收人创建交易
    for (const dist of distributions) {
      // 检查用户存在
      const user = await tx.user.findUnique({
        where: { id: dist.userId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!user) {
        throw new NotFoundError(ErrorCodes.NOT_FOUND, `用户 ${dist.userId} 不存在`);
      }

      // 检查账户存在
      const account = await tx.tokenAccount.findUnique({
        where: { userId: dist.userId },
      });
      if (!account) {
        throw new NotFoundError(ErrorCodes.NOT_FOUND, `用户 ${dist.userId} 的 Token 账户不存在`);
      }

      // 增加余额
      await tx.tokenAccount.update({
        where: { userId: dist.userId },
        data: { balance: { increment: dist.amount } },
      });

      // 创建分红交易记录
      const transaction = await tx.tokenTransaction.create({
        data: {
          fromUserId: null,
          toUserId: dist.userId,
          amount: new Prisma.Decimal(dist.amount),
          direction: 'DIVIDEND',
          status: 'COMPLETED',
          reason: dist.note ? `${reason} - ${dist.note}` : reason,
          adminUserId,
          relatedProjectId: projectId,
          completedAt: new Date(),
        },
        include: {
          toUser: { select: { name: true } },
          adminUser: { select: { name: true } },
          relatedProject: { select: { name: true } },
        },
      });

      // 通知接收人
      await sendNotification({
        type: 'TOKEN_DIVIDEND',
        recipientId: dist.userId,
        actorId: adminUserId,
        objectType: 'TokenTransaction',
        objectId: transaction.id,
        title: '收到项目分红',
        content: `您收到来自项目「${project.name}」的 ${dist.amount} Token 分红`,
      });

      transactions.push(formatTransaction(transaction));
    }

    // 3. 记录项目事件
    await tx.projectEvent.create({
      data: {
        projectId,
        eventType: 'TOKEN_DIVIDEND_DISTRIBUTED',
        title: '项目分红发放',
        description: `管理员发放项目分红，共 ${distributions.reduce((sum, d) => sum + d.amount, 0)} Token`,
        payload: {
          distributions: distributions.map((d) => ({
            userId: d.userId,
            amount: d.amount,
            note: d.note,
          })),
          reason,
        },
        createdById: adminUserId,
      },
    });

    return transactions;
  });
};

// ================================
// 管理员查询功能
// ================================

/**
 * 获取待审核交易列表（管理员）
 */
export const listPendingTransactions = async (
  query: ListPendingTransactionsQueryDto
): Promise<TransactionListResponse> => {
  const { page, pageSize, direction } = query;

  const where: Prisma.TokenTransactionWhereInput = {
    status: 'PENDING_ADMIN_APPROVAL',
    ...(direction && { direction }),
  };

  const [items, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return {
    items: items.map(formatTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * 获取待确认交易列表（收款人）
 */
export const listPendingConfirmTransactions = async (
  userId: string,
  query: ListPendingConfirmQueryDto
): Promise<TransactionListResponse> => {
  const { page, pageSize } = query;

  const where: Prisma.TokenTransactionWhereInput = {
    toUserId: userId,
    status: 'PENDING_RECEIVER_CONFIRM',
  };

  const [items, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return {
    items: items.map(formatTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ================================
// 管理员 Token 总览 (PRD 6.2.7)
// ================================

/**
 * 获取所有用户余额列表（管理员）
 */
export const listAllAccounts = async (
  query: ListAllAccountsQueryDto
): Promise<AccountListResponse> => {
  const { page, pageSize, search, sortBy, sortOrder } = query;

  // 构建查询条件
  const where: Prisma.TokenAccountWhereInput = {
    user: {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      }),
    },
  };

  // 排序
  let orderBy: Prisma.TokenAccountOrderByWithRelationInput;
  switch (sortBy) {
    case 'userName':
      orderBy = { user: { name: sortOrder } };
      break;
    case 'balance':
    case 'initialAmount':
    case 'createdAt':
    default:
      orderBy = { [sortBy]: sortOrder };
  }

  const [items, total] = await Promise.all([
    prisma.tokenAccount.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roleLevel: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenAccount.count({ where }),
  ]);

  return {
    items: items.map((account) => ({
      id: account.id,
      userId: account.userId,
      userName: account.user.name,
      userEmail: account.user.email,
      userPhone: account.user.phone,
      roleLevel: account.user.roleLevel,
      balance: decimalToNumber(account.balance),
      initialAmount: decimalToNumber(account.initialAmount),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * 获取全局 Token 统计（管理员）
 */
export const getGlobalTokenStats = async (
  query: GlobalTokenStatsQueryDto
): Promise<GlobalTokenStatsResponse> => {
  const { startDate, endDate, projectId } = query;

  // 构建时间范围条件
  const dateFilter: Prisma.TokenTransactionWhereInput = {
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    ...(projectId && { relatedProjectId: projectId }),
  };

  // 并行查询各项统计
  const [
    totalBalanceResult,
    totalInitialResult,
    grantedResult,
    deductedResult,
    transferredResult,
    dividendResult,
    meetingRewardResult,
    completedCount,
    pendingCount,
    rejectedCount,
  ] = await Promise.all([
    // 所有用户当前余额总和
    prisma.tokenAccount.aggregate({
      _sum: { balance: true },
    }),
    // 所有用户初始额度总和
    prisma.tokenAccount.aggregate({
      _sum: { initialAmount: true },
    }),
    // 管理员赠与总额
    prisma.tokenTransaction.aggregate({
      where: { ...dateFilter, direction: 'ADMIN_GRANT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 管理员扣除总额
    prisma.tokenTransaction.aggregate({
      where: { ...dateFilter, direction: 'ADMIN_DEDUCT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 普通转账总额
    prisma.tokenTransaction.aggregate({
      where: { ...dateFilter, direction: 'TRANSFER', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 分红总额
    prisma.tokenTransaction.aggregate({
      where: { ...dateFilter, direction: 'DIVIDEND', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 座谈会奖励总额
    prisma.tokenTransaction.aggregate({
      where: { ...dateFilter, direction: 'MEETING_INVITE_REWARD', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    // 已完成交易数
    prisma.tokenTransaction.count({
      where: { ...dateFilter, status: 'COMPLETED' },
    }),
    // 待处理交易数
    prisma.tokenTransaction.count({
      where: {
        ...dateFilter,
        status: { in: ['PENDING_ADMIN_APPROVAL', 'PENDING_RECEIVER_CONFIRM'] },
      },
    }),
    // 被拒绝交易数
    prisma.tokenTransaction.count({
      where: { ...dateFilter, status: 'REJECTED' },
    }),
  ]);

  return {
    totalBalance: decimalToNumber(totalBalanceResult._sum.balance),
    totalInitialAmount: decimalToNumber(totalInitialResult._sum.initialAmount),
    totalGranted: decimalToNumber(grantedResult._sum.amount),
    totalDeducted: decimalToNumber(deductedResult._sum.amount),
    totalTransferred: decimalToNumber(transferredResult._sum.amount),
    totalDividend: decimalToNumber(dividendResult._sum.amount),
    totalMeetingReward: decimalToNumber(meetingRewardResult._sum.amount),
    completedTransactions: completedCount,
    pendingTransactions: pendingCount,
    rejectedTransactions: rejectedCount,
  };
};

/**
 * 获取按项目的 Token 统计（管理员）
 */
export const getProjectTokenStats = async (): Promise<ProjectTokenStatsResponse[]> => {
  // 获取所有有 Token 交易的项目
  const projects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      tokenTransactions: { some: { status: 'COMPLETED' } },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const results: ProjectTokenStatsResponse[] = [];

  for (const project of projects) {
    const [transferResult, dividendResult, countResult] = await Promise.all([
      prisma.tokenTransaction.aggregate({
        where: { relatedProjectId: project.id, direction: 'TRANSFER', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.tokenTransaction.aggregate({
        where: { relatedProjectId: project.id, direction: 'DIVIDEND', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.tokenTransaction.count({
        where: { relatedProjectId: project.id, status: 'COMPLETED' },
      }),
    ]);

    results.push({
      projectId: project.id,
      projectName: project.name,
      totalTransferred: decimalToNumber(transferResult._sum.amount),
      totalDividend: decimalToNumber(dividendResult._sum.amount),
      transactionCount: countResult,
    });
  }

  // 按交易总额降序排列
  return results.sort(
    (a, b) => (b.totalTransferred + b.totalDividend) - (a.totalTransferred + a.totalDividend)
  );
};

/**
 * 管理员查看指定用户的交易记录
 */
export const adminListUserTransactions = async (
  query: AdminListUserTransactionsQueryDto
): Promise<TransactionListResponse> => {
  const { userId, page, pageSize, direction, status } = query;

  const where: Prisma.TokenTransactionWhereInput = {
    OR: [{ fromUserId: userId }, { toUserId: userId }],
    ...(direction && { direction }),
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return {
    items: items.map(formatTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

/**
 * 获取指定用户的账户信息（管理员）
 */
export const getAccountByUserId = async (userId: string): Promise<UserTokenAccountResponse> => {
  const account = await prisma.tokenAccount.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          roleLevel: true,
        },
      },
    },
  });

  if (!account) {
    throw new NotFoundError(ErrorCodes.NOT_FOUND, '用户 Token 账户不存在');
  }

  return {
    id: account.id,
    userId: account.userId,
    userName: account.user.name,
    userEmail: account.user.email,
    userPhone: account.user.phone,
    roleLevel: account.user.roleLevel,
    balance: decimalToNumber(account.balance),
    initialAmount: decimalToNumber(account.initialAmount),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
};

/**
 * 管理员获取所有交易记录
 */
export const listAllTransactions = async (
  query: AdminListAllTransactionsQueryDto
): Promise<TransactionListResponse> => {
  const { page, pageSize, direction, status, startDate, endDate, sortBy, sortOrder } = query;

  const where: Prisma.TokenTransactionWhereInput = {
    ...(direction && { direction }),
    ...(status && { status }),
    ...(startDate && { createdAt: { gte: new Date(startDate) } }),
    ...(endDate && { createdAt: { lte: new Date(endDate) } }),
  };

  const [items, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        adminUser: { select: { name: true } },
        relatedProject: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return {
    items: items.map(formatTransaction),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

