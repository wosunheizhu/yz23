/**
 * 可见性工具单元测试
 * Gate #2, #3: 可见性过滤 + 低层不屏蔽高层
 */

import { describe, it, expect } from 'vitest';
import {
  canUserView,
  getRoleLevelValue,
  validateVisibilityConfig,
  buildVisibilityFilter,
  ROLE_LEVEL_MAP,
} from './visibility.js';

describe('可见性工具', () => {
  describe('ROLE_LEVEL_MAP', () => {
    it('应该定义正确的角色级别', () => {
      expect(ROLE_LEVEL_MAP.PARTNER).toBe(1);
      expect(ROLE_LEVEL_MAP.CORE_PARTNER).toBe(2);
      expect(ROLE_LEVEL_MAP.FOUNDER).toBe(3);
    });
  });

  describe('getRoleLevelValue', () => {
    it('应该返回正确的级别值', () => {
      expect(getRoleLevelValue('PARTNER')).toBe(1);
      expect(getRoleLevelValue('CORE_PARTNER')).toBe(2);
      expect(getRoleLevelValue('FOUNDER')).toBe(3);
    });

    it('未知角色应该返回默认值 1', () => {
      expect(getRoleLevelValue('UNKNOWN')).toBe(1);
    });
  });

  describe('canUserView', () => {
    describe('ALL 可见性', () => {
      const visibility = { visibilityScopeType: 'ALL' as const };

      it('任何用户都应该能看到', () => {
        expect(canUserView(1, 'user-1', false, visibility)).toBe(true);
        expect(canUserView(2, 'user-2', false, visibility)).toBe(true);
        expect(canUserView(3, 'user-3', false, visibility)).toBe(true);
      });
    });

    describe('ROLE_MIN_LEVEL 可见性', () => {
      const visibility = {
        visibilityScopeType: 'ROLE_MIN_LEVEL' as const,
        visibilityMinRoleLevel: 2, // 核心合伙人及以上
      };

      it('级别足够的用户应该能看到', () => {
        expect(canUserView(2, 'user-1', false, visibility)).toBe(true);
        expect(canUserView(3, 'user-2', false, visibility)).toBe(true);
      });

      it('级别不足的用户不应该能看到', () => {
        expect(canUserView(1, 'user-3', false, visibility)).toBe(false);
      });
    });

    describe('CUSTOM 可见性', () => {
      const visibility = {
        visibilityScopeType: 'CUSTOM' as const,
        visibilityUserIds: ['user-1', 'user-2'],
      };

      it('在列表中的用户应该能看到', () => {
        expect(canUserView(1, 'user-1', false, visibility)).toBe(true);
        expect(canUserView(1, 'user-2', false, visibility)).toBe(true);
      });

      it('不在列表中的普通用户不应该能看到', () => {
        expect(canUserView(1, 'user-3', false, visibility)).toBe(false);
      });

      it('联合创始人级别(3)应该始终能看到 CUSTOM 内容', () => {
        expect(canUserView(3, 'user-3', false, visibility)).toBe(true);
      });
    });

    describe('管理员权限', () => {
      it('管理员应该能看到任何内容', () => {
        const visibility = {
          visibilityScopeType: 'CUSTOM' as const,
          visibilityUserIds: [],
        };
        expect(canUserView(1, 'admin', true, visibility)).toBe(true);
      });
    });
  });

  describe('validateVisibilityConfig (Gate #3)', () => {
    it('管理员设置任何可见性都应该有效', () => {
      const config = {
        visibilityScopeType: 'ROLE_MIN_LEVEL' as const,
        visibilityMinRoleLevel: 3,
      };
      const result = validateVisibilityConfig(1, true, config);
      expect(result.valid).toBe(true);
    });

    it('普通用户不能设置比自己更高的可见性级别', () => {
      const config = {
        visibilityScopeType: 'ROLE_MIN_LEVEL' as const,
        visibilityMinRoleLevel: 3, // 联合创始人
      };
      const result = validateVisibilityConfig(1, false, config); // 普通合伙人
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能设置比自己更高');
    });

    it('用户可以设置等于或低于自己级别的可见性', () => {
      const config = {
        visibilityScopeType: 'ROLE_MIN_LEVEL' as const,
        visibilityMinRoleLevel: 2,
      };
      const result = validateVisibilityConfig(2, false, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('buildVisibilityFilter', () => {
    it('管理员应该返回空过滤器（无限制）', () => {
      const filter = buildVisibilityFilter(1, 'admin', true);
      expect(filter).toEqual({});
    });

    it('普通用户应该返回复杂过滤器', () => {
      const filter = buildVisibilityFilter(1, 'user-1', false);
      expect(filter).toHaveProperty('OR');
    });

    it('联合创始人的过滤器应该包含 CUSTOM 全部可见', () => {
      const filter = buildVisibilityFilter(3, 'founder-1', false);
      expect(filter).toHaveProperty('OR');
      const orConditions = (filter as any).OR;
      expect(orConditions.some((c: any) => c.visibilityScopeType === 'CUSTOM')).toBe(true);
    });
  });
});






