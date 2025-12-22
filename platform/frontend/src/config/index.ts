/**
 * 前端配置
 * 元征 · 合伙人赋能平台
 */

export const config = {
  // API 配置
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000, // 30 秒
  },
  
  // 应用信息
  app: {
    name: '元征 · 合伙人赋能平台',
    version: '1.0.0',
  },
  
  // 分页配置
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
  
  // Token 相关
  token: {
    storageKey: 'auth-storage',
  },
  
  // 上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  
  // 移动端断点 (PRD 6.6)
  breakpoints: {
    xs: 375,  // iPhone SE
    sm: 390,  // iPhone 12/13/14
    md: 412,  // Android 常见
    lg: 428,  // iPhone 14 Plus
    xl: 768,  // Tablet
    '2xl': 1024, // Desktop
  },
  
  // 安全区域内边距 (PRD 6.6 viewport-fit=cover)
  safeArea: {
    bottom: 'env(safe-area-inset-bottom, 0px)',
    top: 'env(safe-area-inset-top, 0px)',
  },
  
  // 底部导航高度 (PRD 6.4)
  layout: {
    bottomNavHeight: 56, // px
    safeMargin: 24, // px
  },
  
  // 动效配置 (PRD 6.5)
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type Config = typeof config;

