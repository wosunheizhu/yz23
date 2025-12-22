/**
 * 私聊消息路由 - Node 10
 * PRD 18/6.10: 消息模块（私聊）
 */

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  SendMessageSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
} from './dm.dto.js';
import * as dmService from './dm.service.js';

const router: Router = Router();

// ================================
// 会话相关
// ================================

/**
 * GET /dm/conversations
 * 获取会话列表
 */
router.get(
  '/conversations',
  authenticate,
  validateQuery(ListConversationsQuerySchema),
  async (req: Request, res: Response) => {
    const result = await dmService.listConversations(req.query as never, req.user!.userId);
    res.json(result);
  }
);

/**
 * GET /dm/unread
 * 获取未读消息统计
 */
router.get('/unread', authenticate, async (req: Request, res: Response) => {
  const result = await dmService.getUnreadCount(req.user!.userId);
  res.json(result);
});

/**
 * GET /dm/:partnerId
 * 获取与特定用户的消息历史
 */
router.get(
  '/:partnerId',
  authenticate,
  validateQuery(ListMessagesQuerySchema),
  async (req: Request, res: Response) => {
    const result = await dmService.listMessages(
      req.params.partnerId,
      req.query as never,
      req.user!.userId
    );
    res.json(result);
  }
);

/**
 * POST /dm
 * 发送私信
 */
router.post(
  '/',
  authenticate,
  validateBody(SendMessageSchema),
  async (req: Request, res: Response) => {
    const result = await dmService.sendMessage(req.body, req.user!.userId);
    res.status(201).json(result);
  }
);

/**
 * POST /dm/:partnerId/read
 * 标记与特定用户的消息为已读
 */
router.post('/:partnerId/read', authenticate, async (req: Request, res: Response) => {
  const count = await dmService.markAsRead(req.params.partnerId, req.user!.userId);
  res.json({ success: true, markedCount: count });
});

/**
 * DELETE /dm/:messageId
 * 删除消息
 */
router.delete('/:messageId', authenticate, async (req: Request, res: Response) => {
  await dmService.deleteMessage(req.params.messageId, req.user!.userId);
  res.status(204).send();
});

export { router as dmRouter };

