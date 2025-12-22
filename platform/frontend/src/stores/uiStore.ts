/**
 * UI 状态管理
 * 元征 · 合伙人赋能平台
 */

import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  // 快捷操作面板
  isQuickActionsOpen: boolean;
  openQuickActions: () => void;
  closeQuickActions: () => void;
  toggleQuickActions: () => void;
  
  // Toast 通知
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // 加载状态
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // 侧边栏（桌面端）
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  // 快捷操作面板
  isQuickActionsOpen: false,
  openQuickActions: () => set({ isQuickActionsOpen: true }),
  closeQuickActions: () => set({ isQuickActionsOpen: false }),
  toggleQuickActions: () => set((state) => ({ isQuickActionsOpen: !state.isQuickActionsOpen })),
  
  // Toast 通知
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    
    // 自动移除
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
  
  // 加载状态
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  
  // 侧边栏
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));






