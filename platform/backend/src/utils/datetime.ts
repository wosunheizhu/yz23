/**
 * 时间处理工具
 * 元征 · 合伙人赋能平台
 * 
 * Gate Checklist #13: 所有时间使用 timestamptz；前端显示转换正确
 * PRD 30.2: DB 统一 timestamptz，后端永远用 UTC 存储，前端用用户时区渲染
 */

/**
 * 确保日期为 UTC
 */
export const toUTC = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.toISOString());
};

/**
 * 获取当前 UTC 时间
 */
export const nowUTC = (): Date => {
  return new Date();
};

/**
 * 格式化为 ISO 8601 字符串（带时区）
 */
export const toISOString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
};

/**
 * 解析 ISO 8601 字符串为 Date
 */
export const parseISO = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * 检查时间范围是否重叠
 * PRD 19.5.4: 任意重叠（start < other_end && end > other_start）视为冲突
 */
export const isTimeRangeOverlap = (
  range1: { startTime: Date; endTime: Date },
  range2: { startTime: Date; endTime: Date }
): boolean => {
  return range1.startTime < range2.endTime && range1.endTime > range2.startTime;
};

/**
 * 检查时间是否在范围内
 */
export const isTimeInRange = (
  time: Date,
  range: { startTime: Date; endTime: Date }
): boolean => {
  return time >= range.startTime && time <= range.endTime;
};

/**
 * 检查子范围是否在父范围内
 */
export const isRangeWithinRange = (
  child: { startTime: Date; endTime: Date },
  parent: { startTime: Date; endTime: Date }
): boolean => {
  return child.startTime >= parent.startTime && child.endTime <= parent.endTime;
};

/**
 * 计算时间差（毫秒）
 */
export const diffInMilliseconds = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime());
};

/**
 * 计算时间差（分钟）
 */
export const diffInMinutes = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / (1000 * 60));
};

/**
 * 计算时间差（小时）
 */
export const diffInHours = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / (1000 * 60 * 60));
};

/**
 * 计算时间差（天）
 */
export const diffInDays = (date1: Date, date2: Date): number => {
  return Math.floor(diffInMilliseconds(date1, date2) / (1000 * 60 * 60 * 24));
};

/**
 * 添加分钟
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

/**
 * 添加小时
 */
export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

/**
 * 添加天
 */
export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

/**
 * 获取日期的开始时间（UTC 00:00:00）
 */
export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * 获取日期的结束时间（UTC 23:59:59.999）
 */
export const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * 获取月份的第一天
 */
export const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * 获取月份的最后一天
 */
export const endOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * 验证日期字符串格式
 */
export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * 验证时间范围有效性
 * - 开始时间必须早于结束时间
 * - 可选：检查是否在未来
 */
export const validateTimeRange = (
  startTime: Date | string,
  endTime: Date | string,
  options: { requireFuture?: boolean } = {}
): { valid: boolean; error?: string } => {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  if (isNaN(start.getTime())) {
    return { valid: false, error: '开始时间格式无效' };
  }
  
  if (isNaN(end.getTime())) {
    return { valid: false, error: '结束时间格式无效' };
  }
  
  if (start >= end) {
    return { valid: false, error: '结束时间必须晚于开始时间' };
  }
  
  if (options.requireFuture && start < new Date()) {
    return { valid: false, error: '开始时间必须在未来' };
  }
  
  return { valid: true };
};

/**
 * 验证用餐时间在预约范围内
 * PRD 19.5.2: 用餐时间校验规则
 */
export const validateMealTimeInRange = (
  mealStart: Date,
  mealEnd: Date,
  bookingStart: Date,
  bookingEnd: Date,
  bufferMinutes: number = 30
): { valid: boolean; error?: string } => {
  // 添加缓冲时间
  const bufferedBookingStart = addMinutes(bookingStart, -bufferMinutes);
  const bufferedBookingEnd = addMinutes(bookingEnd, bufferMinutes);
  
  if (mealStart < bufferedBookingStart) {
    return { valid: false, error: '用餐开始时间超出预约时间范围' };
  }
  
  if (mealEnd > bufferedBookingEnd) {
    return { valid: false, error: '用餐结束时间超出预约时间范围' };
  }
  
  if (mealStart >= mealEnd) {
    return { valid: false, error: '用餐结束时间必须晚于开始时间' };
  }
  
  return { valid: true };
};






