/**
 * 工具函数导出
 * 元征 · 合伙人赋能平台
 */

// 数据库
export { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth } from './db.js';

// 日志
export { logger, createRequestLogger, type Logger } from './logger.js';

// 错误处理
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
  ErrorCodes,
  type ErrorCode,
} from './errors.js';

// JWT
export {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  type TokenPayload,
  type DecodedToken,
} from './jwt.js';

// 可见性 (Gate #2, #3)
export {
  canUserView,
  getRoleLevelValue,
  enforceHigherRoleVisibility,
  validateVisibilityConfig,
  buildVisibilityFilter,
  ROLE_LEVEL_MAP,
  LEVEL_ROLE_MAP,
  type VisibilityScopeType,
  type VisibilityConfig,
} from './visibility.js';

// 审计日志 (Gate #4)
export {
  createAuditLog,
  extractClientInfo,
  buildAuditSummary,
  type AuditAction,
  type AuditObjectType,
  type AuditLogParams,
} from './audit.js';

// 分页 (Gate #10)
export {
  parsePaginationParams,
  calculateSkip,
  buildPaginationMeta,
  buildPrismaPageParams,
  buildPaginatedResult,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PaginationParams,
  type PaginationMeta,
  type PaginatedResult,
} from './pagination.js';

// 排序 (Gate #11)
export {
  parseSortParams,
  buildPrismaOrderBy,
  parseSortToPrisma,
  DEFAULT_SORT,
  ALLOWED_SORT_FIELDS,
  type SortOrder,
  type SortParams,
} from './sorting.js';

// 验证 (Gate #9)
export {
  validateBody,
  validateQuery,
  validateParams,
  formatZodError,
  cuidSchema,
  uuidSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  paginationSchema,
  sortSchema,
  visibilitySchema,
  dateTimeSchema,
  dateRangeSchema,
  idParamSchema,
  roleLevelSchema,
  businessTypeSchema,
  demandTypeSchema,
  guestCategorySchema,
} from './validation.js';

// 软删除 (Gate #5)
export {
  notDeleted,
  withNotDeleted,
  buildSoftDeleteFilter,
  softDeleteData,
  restoreData,
  isSoftDeleted,
  isVisibleAfterDelete,
  type SoftDeletePolicy,
} from './softDelete.js';

// 事务 (Gate #7)
export {
  withTransaction,
  batchTransaction,
  tokenTransaction,
  retryTransaction,
  type TransactionClient,
  type TransactionFn,
  type TransactionOptions,
} from './transaction.js';

// 幂等性 (Gate #6)
export {
  generateIdempotencyKey,
  validateStateTransition,
  idempotentOperation,
  TOKEN_TRANSACTION_TRANSITIONS,
  PROJECT_REVIEW_TRANSITIONS,
  PROJECT_BUSINESS_TRANSITIONS,
  DEMAND_STATUS_TRANSITIONS,
  RESPONSE_STATUS_TRANSITIONS,
  TOKEN_GRANT_TASK_TRANSITIONS,
  BOOKING_STATUS_TRANSITIONS,
  MEETING_STATUS_TRANSITIONS,
  type StateTransitions,
} from './idempotency.js';

// 时间处理 (Gate #13)
export {
  toUTC,
  nowUTC,
  toISOString,
  parseISO,
  isTimeRangeOverlap,
  isTimeInRange,
  isRangeWithinRange,
  diffInMilliseconds,
  diffInMinutes,
  diffInHours,
  diffInDays,
  addMinutes,
  addHours,
  addDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  isValidDateString,
  validateTimeRange,
  validateMealTimeInRange,
} from './datetime.js';

// 通知 (Gate #16)
export {
  sendNotification,
  sendBulkNotifications,
  generateDedupeKey,
  getNotificationTitle,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationPriority,
  type NotificationParams,
  type NotificationTemplate,
} from './notification.js';

// 密码 (PRD 1665)
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateRandomPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './password.js';

// 频控 (PRD 8.2)
export {
  checkRateLimit,
  enforceRateLimit,
  resetRateLimit,
  cleanupExpiredRecords,
  checkVerificationCodeRateLimit,
  checkLoginRateLimit,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rateLimit.js';

// 邮件 (PRD D)
export {
  sendEmail,
  processEmailOutbox,
  sendVerificationCodeEmail,
  retryFailedEmails,
  type EmailParams,
  type EmailResult,
} from './email.js';

// 冲突检测 (PRD 4.4, 19.5.4)
export {
  checkVenueConflict,
  enforceNoConflict,
  getAvailableSlots,
  formatConflictMessage,
  type ConflictObjectType,
  type ConflictDetail,
  type ConflictCheckResult,
} from './conflict.js';

// 性能监控 (PRD 4.5, Gate #18)
export {
  PERFORMANCE_THRESHOLDS,
  createTimer,
  endTimer,
  recordMetric,
  calculateP95,
  getMetrics,
  performanceMiddleware,
  cleanupMetrics,
  type RequestTimer,
} from './performance.js';

// 系统配置 (PRD 可配置项)
export {
  getSystemConfig,
  getConfigValue,
  updateSystemConfig,
  resetSystemConfig,
  getGuestRewardAmount,
  getTokenInitialAmount,
  type SystemConfig,
} from './systemConfig.js';

// 安全工具 (PRD 4.5)
export {
  generateVerificationCode,
  generateSecureToken,
  generateUUID,
  sha256,
  hmacSha256,
  secureCompare,
  maskSensitiveData,
  getClientIP,
  isPrivateIP,
  detectSuspiciousRequest,
  escapeHtml,
  sanitizeInput,
} from './security.js';
