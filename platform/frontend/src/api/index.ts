/**
 * API 导出
 * 元征 · 合伙人赋能平台
 */

export * from './client';
export * as authApi from './auth';
export * as usersApi from './users';

// Node 2: 项目域
export * as projectsApi from './projects';
export * as demandsApi from './demands';
export * as responsesApi from './responses';
export * as valueRecordsApi from './value-records';

// Node 3: Token 账本
export * as tokensApi from './tokens';

// Node 4: 人脉资源
export * as networkResourcesApi from './network-resources';

// Node 5: 日历 + 场地 + 预约 + 公司座谈会 + Token 发放任务 + 线下到访
export * as venuesApi from './venues';
export * as bookingsApi from './bookings';
export * as meetingsApi from './meetings';
export * as calendarApi from './calendar';
export * as tokenGrantTasksApi from './token-grant-tasks';
export * as onsiteVisitsApi from './onsite-visits';

// Node 8: 通知中心
export * as notificationOutboxApi from './notification-outbox';

// Node 9: 管理员控制台
export * as adminApi from './admin';
export * as announcementsApi from './announcements';
export * as feedbacksApi from './feedbacks';

// Node 10: 补全模块（社群、私聊、信箱、AI、仪表盘）
export { communityApi } from './community';
export { dmApi, inboxApi } from './messages';
export { resourceAIApi } from './ai';
export { dashboardApi } from './dashboard';
