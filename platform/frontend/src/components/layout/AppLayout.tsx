/**
 * AppLayout 应用主布局
 * 高端简约现代艺术画廊风格
 * 
 * 布局结构：
 * - Header（可选）
 * - Main Content（弹性区域）
 * - BottomNav（可选）
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  /** 头部配置 */
  header?: {
    variant?: 'default' | 'transparent' | 'dark';
    title?: string;
    showBack?: boolean;
    showLogo?: boolean;
    showSearch?: boolean;
    showNotification?: boolean;
    notificationCount?: number;
    rightAction?: ReactNode;
    onBack?: () => void;
    onSearch?: () => void;
    onNotification?: () => void;
  };
  /** 是否显示底部导航 */
  showBottomNav?: boolean;
  /** 消息数量 */
  messageCount?: number;
  /** 背景颜色 */
  bgColor?: 'white' | 'off-white' | 'dark';
  /** 是否添加底部安全边距 */
  safeBottom?: boolean;
}

const bgStyles = {
  white: 'bg-pure-white',
  'off-white': 'bg-off-white',
  dark: 'bg-deep-black',
};

export const AppLayout = ({
  children,
  header,
  showBottomNav = true,
  messageCount = 0,
  bgColor = 'off-white',
  safeBottom = true,
}: AppLayoutProps) => {
  return (
    <div className={`min-h-screen flex flex-col ${bgStyles[bgColor]}`}>
      {/* 顶部导航 */}
      {header && <Header {...header} />}

      {/* 主内容区域 */}
      <main
        className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-20' : ''}`}
      >
        {children}
      </main>

      {/* 底部导航 */}
      {showBottomNav && <BottomNav messageCount={messageCount} />}
    </div>
  );
};

/**
 * SimpleLayout 简洁布局
 * 用于登录、详情等不需要底部导航的页面
 */
interface SimpleLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backPath?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  bgColor?: 'white' | 'off-white' | 'dark';
}

export const SimpleLayout = ({
  children,
  title,
  showBack = true,
  backPath,
  onBack,
  rightAction,
  bgColor = 'off-white',
}: SimpleLayoutProps) => {
  const navigate = useNavigate();
  
  // 如果提供了 backPath，使用路由跳转
  const handleBack = backPath 
    ? () => navigate(backPath)
    : onBack;

  return (
    <AppLayout
      showBottomNav={false}
      bgColor={bgColor}
      header={{
        title,
        showBack,
        onBack: handleBack,
        rightAction,
      }}
    >
      {children}
    </AppLayout>
  );
};

/**
 * FullScreenLayout 全屏布局
 * 用于登录、启动画面等
 */
interface FullScreenLayoutProps {
  children: ReactNode;
  bgColor?: 'white' | 'off-white' | 'dark';
}

export const FullScreenLayout = ({
  children,
  bgColor = 'dark',
}: FullScreenLayoutProps) => {
  return (
    <div
      className={`
        min-h-screen flex flex-col
        ${bgStyles[bgColor]}
      `}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
};

export default AppLayout;
