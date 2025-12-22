/**
 * 健康检查路由
 * 元征 · 合伙人赋能平台
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../utils/db.js';
import { successResponse } from '../../middleware/errorHandler.js';
import { config } from '../../config/index.js';

const router: Router = Router();

/**
 * GET /health
 * 健康检查端点
 */
router.get('/', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();
  
  const health = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: '1.0.0',
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  };
  
  if (dbHealthy) {
    return successResponse(res, health);
  } else {
    return res.status(503).json({
      success: false,
      data: health,
      traceId: req.traceId,
    });
  }
});

/**
 * GET /health/ready
 * 就绪检查（用于 Kubernetes）
 */
router.get('/ready', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();
  
  if (dbHealthy) {
    return successResponse(res, { ready: true });
  } else {
    return res.status(503).json({
      success: false,
      error: { code: 503, message: 'Service not ready' },
      traceId: req.traceId,
    });
  }
});

/**
 * GET /health/live
 * 存活检查（用于 Kubernetes）
 */
router.get('/live', (_req: Request, res: Response) => {
  return successResponse(res, { alive: true });
});

export default router;

