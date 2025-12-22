/**
 * 模块导出
 * 元征 · 合伙人赋能平台
 */

// Node 0: 健康检查
export { healthRouter } from './health/index.js';

// Node 1: 身份、角色、可见性
export { authRouter } from './auth/index.js';
export { userRouter } from './users/index.js';

// Node 2: 项目域
export { projectRouter } from './projects/index.js';
export { demandRouter } from './demands/index.js';
export { responseRouter } from './responses/index.js';
export { valueRecordRouter } from './value-records/index.js';

// Node 3: Token 账本
export { tokenRouter } from './tokens/index.js';

// Node 4: 人脉资源
export { networkResourceRouter, resourceAIRouter } from './network-resources/index.js';

// Node 5: 日历 + 场地 + 预约 + 公司座谈会 + Token 发放任务
export { venueRouter } from './venues/index.js';
export { bookingRouter } from './bookings/index.js';
export { meetingRouter } from './meetings/index.js';
export { calendarRouter } from './calendar/index.js';
export { tokenGrantTaskRouter } from './token-grant-tasks/index.js';
export { onsiteVisitRouter } from './onsite-visits/index.js';

// Node 8: 通知中心
export { outboxRouter } from './notifications/index.js';

// Node 9: 管理员控制台
export { adminRouter, adminDashboardRouter } from './admin/index.js';
export { announcementRouter } from './announcements/index.js';
export { feedbackRouter } from './feedbacks/index.js';

// Node 10: 补全模块（新闻、社群、私聊、信箱、AI、仪表盘）
export { newsRouter, newsAIRouter } from './news/index.js';
export { postRouter } from './community/index.js';
export { dmRouter, inboxRouter } from './messages/index.js';
export { userDashboardRouter } from './dashboard/index.js';
