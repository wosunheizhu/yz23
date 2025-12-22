/**
 * Header 顶部导航组件
 * 高端简约现代艺术画廊风格
 * 
 * 设计规范：
 * - 高度：60px
 * - 背景：纯白，无阴影
 * - 分隔：底部0.5px细线
 * - Logo：简约字母标识
 */

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { IconButton } from '../ui/Button';
import { CountBadge } from '../ui/Badge';

interface HeaderProps {
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
}

export const Header = ({
  variant = 'default',
  title,
  showBack = false,
  showLogo = false,
  showSearch = false,
  showNotification = false,
  notificationCount = 0,
  rightAction,
  onBack,
  onSearch,
  onNotification,
}: HeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const variantStyles = {
    default: 'bg-pure-white border-b border-silk-gray',
    transparent: 'bg-transparent',
    dark: 'bg-deep-black border-b border-charcoal',
  };

  const textStyles = {
    default: 'text-ink-black',
    transparent: 'text-ink-black',
    dark: 'text-pure-white',
  };

  const iconStyles = {
    default: 'text-charcoal hover:text-ink-black',
    transparent: 'text-charcoal hover:text-ink-black',
    dark: 'text-stone-gray hover:text-pure-white',
  };

  return (
    <header
      className={`
        sticky top-0 z-40
        flex items-center justify-between
        h-[60px] px-lg
        ${variantStyles[variant]}
      `}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* 左侧区域 */}
      <div className="flex-1 flex items-center min-w-0">
        {showBack && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className={`-ml-2 p-2 ${iconStyles[variant]} transition-colors`}
            aria-label="返回"
          >
            <ChevronLeft size={24} strokeWidth={1.5} />
          </motion.button>
        )}
        {showLogo && !showBack && (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className={`font-display text-xl tracking-wider ${textStyles[variant]}`}>
              元征
            </span>
            <span className="w-px h-4 bg-silk-gray flex-shrink-0" />
            <span className="font-serif-cn text-xs tracking-wide text-stone-gray whitespace-nowrap">
              合伙人赋能
            </span>
          </div>
        )}
      </div>

      {/* 中间标题 */}
      {title && (
        <h1 className={`
          flex-1 text-center font-serif-cn text-subtitle
          truncate ${textStyles[variant]}
        `}>
          {title}
        </h1>
      )}

      {/* 右侧区域 */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0">
        {showSearch && (
          <IconButton
            icon={<Search size={20} strokeWidth={1.5} />}
            onClick={onSearch}
            className={iconStyles[variant]}
            aria-label="搜索"
          />
        )}
        {showNotification && (
          <div className="relative">
            <IconButton
              icon={<Bell size={20} strokeWidth={1.5} />}
              onClick={onNotification}
              className={iconStyles[variant]}
              aria-label="通知"
            />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1">
                <CountBadge count={notificationCount} size="sm" />
              </span>
            )}
          </div>
        )}
        {rightAction}
      </div>
    </header>
  );
};

export default Header;

