/**
 * 时间处理工具单元测试
 * Gate #13: 时间处理 - timestamptz
 */

import { describe, it, expect } from 'vitest';
import {
  toUTC,
  nowUTC,
  isTimeRangeOverlap,
  isTimeInRange,
  validateTimeRange,
  validateMealTimeInRange,
  addMinutes,
  addHours,
  addDays,
  startOfDay,
  endOfDay,
} from './datetime.js';

describe('时间处理工具', () => {
  describe('toUTC / nowUTC', () => {
    it('nowUTC 应该返回当前 UTC 时间', () => {
      const now = nowUTC();
      expect(now).toBeInstanceOf(Date);
    });

    it('toUTC 应该转换日期为 UTC', () => {
      const date = new Date('2024-01-15T10:00:00');
      const utc = toUTC(date);
      expect(utc).toBeInstanceOf(Date);
    });
  });

  describe('isTimeRangeOverlap', () => {
    const base = new Date('2024-01-15T10:00:00Z');
    
    it('完全重叠应该返回 true', () => {
      const start1 = base;
      const end1 = addHours(base, 2);
      const start2 = addMinutes(base, 30);
      const end2 = addMinutes(base, 90);
      
      expect(isTimeRangeOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('部分重叠应该返回 true', () => {
      const start1 = base;
      const end1 = addHours(base, 2);
      const start2 = addHours(base, 1);
      const end2 = addHours(base, 3);
      
      expect(isTimeRangeOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('相邻不重叠应该返回 false', () => {
      const start1 = base;
      const end1 = addHours(base, 2);
      const start2 = addHours(base, 2); // 刚好在 end1 之后
      const end2 = addHours(base, 4);
      
      expect(isTimeRangeOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('完全不重叠应该返回 false', () => {
      const start1 = base;
      const end1 = addHours(base, 2);
      const start2 = addHours(base, 3);
      const end2 = addHours(base, 5);
      
      expect(isTimeRangeOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('isTimeInRange', () => {
    const start = new Date('2024-01-15T10:00:00Z');
    const end = new Date('2024-01-15T12:00:00Z');

    it('在范围内应该返回 true', () => {
      const time = new Date('2024-01-15T11:00:00Z');
      expect(isTimeInRange(time, start, end)).toBe(true);
    });

    it('在范围外应该返回 false', () => {
      const time = new Date('2024-01-15T13:00:00Z');
      expect(isTimeInRange(time, start, end)).toBe(false);
    });

    it('边界值（开始时间）应该返回 true', () => {
      expect(isTimeInRange(start, start, end)).toBe(true);
    });
  });

  describe('validateTimeRange', () => {
    it('有效范围应该通过', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T12:00:00Z');
      
      const result = validateTimeRange(start, end);
      expect(result.valid).toBe(true);
    });

    it('结束时间早于开始时间应该失败', () => {
      const start = new Date('2024-01-15T12:00:00Z');
      const end = new Date('2024-01-15T10:00:00Z');
      
      const result = validateTimeRange(start, end);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('早于');
    });
  });

  describe('validateMealTimeInRange (PRD 19.5.2)', () => {
    const bookingStart = new Date('2024-01-15T10:00:00Z');
    const bookingEnd = new Date('2024-01-15T14:00:00Z');

    it('用餐时间在预约范围内应该通过', () => {
      const mealStart = new Date('2024-01-15T12:00:00Z');
      const mealEnd = new Date('2024-01-15T13:00:00Z');
      
      const result = validateMealTimeInRange(
        mealStart, mealEnd, bookingStart, bookingEnd
      );
      expect(result.valid).toBe(true);
    });

    it('用餐时间超出预约范围应该失败（无缓冲）', () => {
      const mealStart = new Date('2024-01-15T13:00:00Z');
      const mealEnd = new Date('2024-01-15T15:00:00Z'); // 超出 bookingEnd
      
      const result = validateMealTimeInRange(
        mealStart, mealEnd, bookingStart, bookingEnd, 0
      );
      expect(result.valid).toBe(false);
    });

    it('用餐时间在缓冲范围内应该通过', () => {
      const mealStart = new Date('2024-01-15T13:30:00Z');
      const mealEnd = new Date('2024-01-15T14:20:00Z'); // 超出20分钟
      
      const result = validateMealTimeInRange(
        mealStart, mealEnd, bookingStart, bookingEnd, 30 // 30分钟缓冲
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('日期计算', () => {
    const base = new Date('2024-01-15T10:30:00Z');

    it('addMinutes 应该正确加分钟', () => {
      const result = addMinutes(base, 30);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCHours()).toBe(11);
    });

    it('addHours 应该正确加小时', () => {
      const result = addHours(base, 5);
      expect(result.getUTCHours()).toBe(15);
    });

    it('addDays 应该正确加天', () => {
      const result = addDays(base, 7);
      expect(result.getUTCDate()).toBe(22);
    });

    it('startOfDay 应该返回当天开始', () => {
      const result = startOfDay(base);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it('endOfDay 应该返回当天结束', () => {
      const result = endOfDay(base);
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });
  });
});






