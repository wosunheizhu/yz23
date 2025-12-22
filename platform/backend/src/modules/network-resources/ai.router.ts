/**
 * 资源 AI 路由 - Node 10
 * PRD 6.5.5: 资源探索 – 与 AI 数字人对话
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';
import { getRoleLevelValue } from '../../utils/visibility.js';
import { prisma } from '../../utils/db.js';
import * as aiService from '../../services/ai.service.js';

const router: Router = Router();

// ================================
// 请求验证
// ================================

const ChatWithResourceSchema = z.object({
  message: z.string().min(1).max(2000),
});

// ================================
// AI 路由
// ================================

/**
 * POST /network-resources/ai/chat
 * 与资源探索 AI 对话
 * PRD 6.5.5: 资源探索 – 与 AI 数字人对话
 */
router.post(
  '/ai/chat',
  authenticate,
  validateBody(ChatWithResourceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;
      const userId = req.user!.userId;
      const roleLevel = getRoleLevelValue(req.user!.roleLevel);

      // 获取用户可见的资源作为上下文
      // 简化的可见性过滤
      const resources = await prisma.networkResource.findMany({
        where: {
          isDeleted: false,
          OR: [
            { visibilityScopeType: 'ALL' },
            {
              visibilityScopeType: 'ROLE_MIN_LEVEL',
              visibilityMinRoleLevel: { lte: roleLevel },
            },
            {
              visibilityScopeType: 'CUSTOM',
              visibilityUserIds: { has: userId },
            },
            { ownerId: userId },
          ],
        },
        select: {
          id: true,
          name: true,
          category: true,
          keywords: true,
          owner: { select: { name: true } },
        },
        take: 20,
      });

      const result = await aiService.chatWithResourceAssistant(message, {
        availableResources: resources.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          ownerName: r.owner.name,
          keywords: r.keywords,
        })),
        userRoleLevel: roleLevel,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /network-resources/ai/recommend
 * 根据用户需求 AI 推荐资源
 */
router.post(
  '/ai/recommend',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, limit = 10 } = req.body;
      const userId = req.user!.userId;
      const roleLevel = getRoleLevelValue(req.user!.roleLevel);

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: '请提供查询内容' });
        return;
      }

      // 生成搜索标签
      const tags = await aiService.generateTags(query, 'resource');

      // 使用标签搜索资源
      const resources = await prisma.networkResource.findMany({
        where: {
          isDeleted: false,
          OR: [
            { visibilityScopeType: 'ALL' },
            {
              visibilityScopeType: 'ROLE_MIN_LEVEL',
              visibilityMinRoleLevel: { lte: roleLevel },
            },
            {
              visibilityScopeType: 'CUSTOM',
              visibilityUserIds: { has: userId },
            },
            { ownerId: userId },
          ],
          AND: [
            {
              OR: tags.flatMap((tag) => [
                { name: { contains: tag, mode: 'insensitive' as const } },
                { description: { contains: tag, mode: 'insensitive' as const } },
                { keywords: { has: tag } },
                { category: { contains: tag, mode: 'insensitive' as const } },
              ]),
            },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
        },
        take: limit,
      });

      res.json({
        searchTags: tags,
        data: resources.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          description: r.description,
          keywords: r.keywords,
          owner: {
            id: r.owner.id,
            name: r.owner.name,
            avatar: r.owner.avatar,
          },
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as resourceAIRouter };

