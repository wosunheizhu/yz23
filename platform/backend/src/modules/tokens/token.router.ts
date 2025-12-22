/**
 * Token 模块 Router
 * Node 3: Token 账本
 * 
 * API 端点:
 * 
 * 用户功能:
 * - GET    /tokens/account             - 获取我的 Token 账户
 * - GET    /tokens/transactions        - 获取我的交易列表
 * - GET    /tokens/transactions/:id    - 获取交易详情
 * - GET    /tokens/stats               - 获取我的 Token 统计
 * - POST   /tokens/transfer            - 发起转账
 * - POST   /tokens/transactions/:id/confirm  - 收款人确认
 * - POST   /tokens/transactions/:id/cancel   - 取消转账
 * - GET    /tokens/pending-confirm     - 获取待我确认的交易
 * 
 * 管理员功能:
 * - GET    /tokens/admin/pending       - 获取待审核交易列表
 * - POST   /tokens/admin/transactions/:id/review  - 审核转账
 * - POST   /tokens/admin/grant         - 管理员赠与
 * - POST   /tokens/admin/deduct        - 管理员扣除
 * - POST   /tokens/admin/dividend      - 项目分红
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createTransferSchema,
  adminReviewTransferSchema,
  receiverConfirmSchema,
  adminGrantSchema,
  adminDeductSchema,
  distributeDividendSchema,
  cancelTransferSchema,
  listTransactionsQuerySchema,
  listPendingTransactionsQuerySchema,
  listPendingConfirmQuerySchema,
  listAllAccountsQuerySchema,
  globalTokenStatsQuerySchema,
  adminListUserTransactionsQuerySchema,
  adminListAllTransactionsQuerySchema,
} from './token.dto.js';
import * as tokenService from './token.service.js';

const router: Router = Router();

// ================================
// 用户功能
// ================================

/**
 * GET /tokens/account
 * 获取我的 Token 账户
 */
router.get(
  '/account',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await tokenService.getTokenAccount(req.user!.userId);
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/transactions
 * 获取我的交易列表
 */
router.get(
  '/transactions',
  authenticate,
  validateQuery(listTransactionsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.listUserTransactions(req.user!.userId, req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/stats
 * 获取我的 Token 统计
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await tokenService.getTokenStats(req.user!.userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/pending-confirm
 * 获取待我确认的交易
 */
router.get(
  '/pending-confirm',
  authenticate,
  validateQuery(listPendingConfirmQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.listPendingConfirmTransactions(
        req.user!.userId,
        req.query as any
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/transfer
 * 发起转账
 */
router.post(
  '/transfer',
  authenticate,
  validateBody(createTransferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.createTransfer(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/transactions/:id
 * 获取交易详情
 */
router.get(
  '/transactions/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.getTransaction(
        req.params.id,
        req.user!.userId,
        req.user!.isAdmin
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/transactions/:id/confirm
 * 收款人确认
 */
router.post(
  '/transactions/:id/confirm',
  authenticate,
  validateBody(receiverConfirmSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.receiverConfirm(
        req.params.id,
        req.user!.userId,
        req.body
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/transactions/:id/cancel
 * 取消转账（发起人在待审核阶段可取消）
 */
router.post(
  '/transactions/:id/cancel',
  authenticate,
  validateBody(cancelTransferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.cancelTransfer(
        req.params.id,
        req.user!.userId,
        req.body
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 管理员功能
// ================================

/**
 * GET /tokens/admin/pending
 * 获取待审核交易列表
 */
router.get(
  '/admin/pending',
  authenticate,
  requireAdmin,
  validateQuery(listPendingTransactionsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.listPendingTransactions(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/admin/transactions
 * 获取所有交易记录（管理员）
 */
router.get(
  '/admin/transactions',
  authenticate,
  requireAdmin,
  validateQuery(adminListAllTransactionsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.listAllTransactions(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/admin/transactions/:id/review
 * 审核转账
 */
router.post(
  '/admin/transactions/:id/review',
  authenticate,
  requireAdmin,
  validateBody(adminReviewTransferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.adminReviewTransfer(
        req.params.id,
        req.user!.userId,
        req.body
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/admin/grant
 * 管理员赠与
 */
router.post(
  '/admin/grant',
  authenticate,
  requireAdmin,
  validateBody(adminGrantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.adminGrant(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/admin/deduct
 * 管理员扣除
 */
router.post(
  '/admin/deduct',
  authenticate,
  requireAdmin,
  validateBody(adminDeductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await tokenService.adminDeduct(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tokens/admin/dividend
 * 项目分红
 */
router.post(
  '/admin/dividend',
  authenticate,
  requireAdmin,
  validateBody(distributeDividendSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await tokenService.distributeDividend(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }
);

// ================================
// 管理员 Token 总览 (PRD 6.2.7)
// ================================

/**
 * GET /tokens/admin/accounts
 * 获取所有用户余额列表
 */
router.get(
  '/admin/accounts',
  authenticate,
  requireAdmin,
  validateQuery(listAllAccountsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.listAllAccounts(req.query as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/admin/accounts/:userId
 * 获取指定用户的账户信息
 */
router.get(
  '/admin/accounts/:userId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await tokenService.getAccountByUserId(req.params.userId);
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/admin/stats
 * 获取全局 Token 统计
 */
router.get(
  '/admin/stats',
  authenticate,
  requireAdmin,
  validateQuery(globalTokenStatsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await tokenService.getGlobalTokenStats(req.query as any);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/admin/stats/projects
 * 获取按项目的 Token 统计
 */
router.get(
  '/admin/stats/projects',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await tokenService.getProjectTokenStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /tokens/admin/users/:userId/transactions
 * 管理员查看指定用户的交易记录
 */
router.get(
  '/admin/users/:userId/transactions',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await tokenService.adminListUserTransactions({
        userId: req.params.userId,
        ...req.query as any,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as tokenRouter };

