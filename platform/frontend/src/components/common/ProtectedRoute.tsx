/**
 * 路由守卫组件
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.2: 未登录访问任何内部页面 → 强制跳转登录
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 需要的最低角色级别 (1=普通, 2=核心, 3=联合创始人) */
  minRoleLevel?: number;
  /** 是否需要管理员权限 */
  requireAdmin?: boolean;
}

/**
 * 角色级别映射
 */
const ROLE_LEVEL_MAP: Record<string, number> = {
  PARTNER: 1,
  CORE_PARTNER: 2,
  FOUNDER: 3,
};

/**
 * 受保护的路由组件
 * 未登录用户将被重定向到登录页
 */
export const ProtectedRoute = ({
  children,
  minRoleLevel = 1,
  requireAdmin = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 未登录 → 跳转登录页
  if (!isAuthenticated || !user) {
    // 保存来源路径，登录后跳回
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查管理员权限
  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 检查角色级别权限
  const userRoleLevel = ROLE_LEVEL_MAP[user.roleLevel] || 1;
  if (userRoleLevel < minRoleLevel && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * 仅管理员可访问的路由
 */
export const AdminRoute = ({ children }: { children: ReactNode }) => {
  return (
    <ProtectedRoute requireAdmin>
      {children}
    </ProtectedRoute>
  );
};

/**
 * 仅联合创始人可访问的路由
 */
export const FounderRoute = ({ children }: { children: ReactNode }) => {
  return (
    <ProtectedRoute minRoleLevel={3}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * 核心合伙人及以上可访问的路由
 */
export const CorePartnerRoute = ({ children }: { children: ReactNode }) => {
  return (
    <ProtectedRoute minRoleLevel={2}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;






