/**
 * 元征 · 合伙人赋能平台
 * 后端服务入口
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './utils/db.js';
import { startEmailProcessor, stopEmailProcessor, startVoteProcessor, stopVoteProcessor, startNewsProcessor, stopNewsProcessor } from './jobs/index.js';
import {
  traceIdMiddleware,
  requestLoggerMiddleware,
  errorHandler,
  notFoundHandler,
  successResponse,
} from './middleware/index.js';
import { 
  healthRouter, 
  authRouter, 
  userRouter,
  projectRouter,
  demandRouter,
  responseRouter,
  valueRecordRouter,
  tokenRouter,
  networkResourceRouter,
  resourceAIRouter,
  // Node 5: 日历 + 场地 + 预约
  venueRouter,
  bookingRouter,
  meetingRouter,
  calendarRouter,
  tokenGrantTaskRouter,
  onsiteVisitRouter,
  // Node 8: 通知中心
  outboxRouter,
  // Node 9: 管理员控制台
  adminRouter,
  adminDashboardRouter,
  announcementRouter,
  feedbackRouter,
  // Node 10: 补全模块
  newsRouter,
  newsAIRouter,
  postRouter,
  dmRouter,
  inboxRouter,
  userDashboardRouter,
} from './modules/index.js';

// 创建 Express 应用
const app: Express = express();

// ================================
// 基础中间件
// ================================

// 安全头
app.use(helmet({
  contentSecurityPolicy: config.env === 'production',
}));

// CORS - 支持多个域名（逗号分隔）
const corsOrigins = config.cors.origin.split(',').map(o => o.trim());
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
}));

// JSON 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trace ID
app.use(traceIdMiddleware);

// 请求日志
app.use(requestLoggerMiddleware);

// ================================
// 路由
// ================================

// 健康检查
app.use('/health', healthRouter);

// API 版本信息
app.get(`${config.apiPrefix}`, (req, res) => {
  return successResponse(res, {
    name: '元征 · 合伙人赋能平台',
    version: '1.0.0',
    apiVersion: 'v1',
    documentation: '/api/v1/docs',
  });
});

// Node 1: 身份、角色、可见性
app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/users`, userRouter);

// Node 2: 项目域
app.use(`${config.apiPrefix}/projects`, projectRouter);
app.use(`${config.apiPrefix}/demands`, demandRouter);
app.use(`${config.apiPrefix}/responses`, responseRouter);
app.use(`${config.apiPrefix}/value-records`, valueRecordRouter);

// Node 3: Token 账本
app.use(`${config.apiPrefix}/tokens`, tokenRouter);

// Node 4: 人脉资源
app.use(`${config.apiPrefix}/network-resources`, networkResourceRouter);
app.use(`${config.apiPrefix}/network-resources`, resourceAIRouter);

// Node 5: 日历 + 场地 + 预约 + 公司座谈会 + 线下到访
app.use(`${config.apiPrefix}/venues`, venueRouter);
app.use(`${config.apiPrefix}/bookings`, bookingRouter);
app.use(`${config.apiPrefix}/company-meetings`, meetingRouter);
app.use(`${config.apiPrefix}/calendar`, calendarRouter);
app.use(`${config.apiPrefix}/admin/token-grant-tasks`, tokenGrantTaskRouter);
app.use(`${config.apiPrefix}/onsite-visits`, onsiteVisitRouter);

// Node 8: 通知中心
app.use(`${config.apiPrefix}/admin/notification-outbox`, outboxRouter);

// Node 9: 管理员控制台
app.use(`${config.apiPrefix}/admin`, adminRouter);
app.use(`${config.apiPrefix}/admin/dashboard`, adminDashboardRouter);
app.use(`${config.apiPrefix}/announcements`, announcementRouter);
app.use(`${config.apiPrefix}/feedbacks`, feedbackRouter);

// Node 10: 补全模块（新闻、社群、投票、私聊、信箱、AI、仪表盘）
app.use(`${config.apiPrefix}/news`, newsRouter);
app.use(`${config.apiPrefix}/news`, newsAIRouter);
app.use(`${config.apiPrefix}/posts`, postRouter);
app.use(`${config.apiPrefix}/dm`, dmRouter);
app.use(`${config.apiPrefix}/inbox`, inboxRouter);
app.use(`${config.apiPrefix}/dashboard`, userDashboardRouter);

// ================================
// 错误处理
// ================================

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// ================================
// 服务启动
// ================================

const startServer = async (): Promise<void> => {
  try {
    // 连接数据库
    await connectDatabase();
    
    // 启动邮件处理器（Node 8: 通知中心）
    startEmailProcessor();
    
    // 启动投票处理器（Node 10: 投票自动关闭）
    await startVoteProcessor().catch((error) => {
      logger.warn({ error }, '投票处理器启动失败，将继续运行');
    });
    
    // 启动新闻处理器（Node 10: 新闻源自动爬取）
    await startNewsProcessor().catch((error) => {
      logger.warn({ error }, '新闻处理器启动失败，将继续运行');
    });
    
    // 启动服务
    app.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.env,
        apiPrefix: config.apiPrefix,
      }, `🚀 元征平台后端服务启动成功 http://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error({ error }, '服务启动失败');
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`收到 ${signal} 信号，正在关闭服务...`);
  
  try {
    // 停止邮件处理器
    stopEmailProcessor();
    
    // 停止投票处理器
    stopVoteProcessor();
    
    // 停止新闻处理器
    stopNewsProcessor();
    
    await disconnectDatabase();
    logger.info('服务已安全关闭');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '关闭服务时发生错误');
    process.exit(1);
  }
};

// 监听退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, '未捕获的异常');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '未处理的 Promise 拒绝');
});

// 启动服务
startServer();

export default app;

