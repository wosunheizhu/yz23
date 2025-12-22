/**
 * Badge 徽章组件
 * 高端简约现代艺术画廊风格
 */

import { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'gold' | 'new' | 'success' | 'warning' | 'error' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gallery-gray border-silk-gray text-charcoal',
  gold: 'bg-champagne-gold border-champagne-gold text-pure-white',
  new: 'bg-champagne-gold/10 border-champagne-gold/30 text-champagne-gold',
  success: 'bg-success-light border-success/30 text-success',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  error: 'bg-error/10 border-error/30 text-error',
  outline: 'bg-transparent border-silk-gray text-charcoal',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-tiny',
};

export const Badge = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center
        font-sans tracking-wider
        border-hairline rounded-gallery
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * 状态点
 */
interface StatusDotProps {
  status: 'online' | 'busy' | 'offline' | 'new';
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const dotStatusStyles = {
  online: 'bg-success',
  busy: 'bg-warning',
  offline: 'bg-stone-gray',
  new: 'bg-champagne-gold',
};

const dotSizeStyles = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
};

export const StatusDot = ({ status, pulse = false, size = 'md' }: StatusDotProps) => {
  return (
    <span
      className={`
        inline-block rounded-full
        ${dotStatusStyles[status]}
        ${dotSizeStyles[size]}
        ${pulse ? 'animate-pulse' : ''}
      `}
    />
  );
};

/**
 * 计数徽章
 */
interface CountBadgeProps {
  count: number;
  max?: number;
  size?: 'sm' | 'md';
  variant?: 'gold' | 'dark';
}

export const CountBadge = ({
  count,
  max = 99,
  size = 'md',
  variant = 'gold',
}: CountBadgeProps) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  const variantStyle = variant === 'gold'
    ? 'bg-champagne-gold text-deep-black'
    : 'bg-deep-black text-pure-white';

  const sizeStyle = size === 'sm'
    ? 'min-w-[14px] h-[14px] text-[9px]'
    : 'min-w-[18px] h-[18px] text-[10px]';

  return (
    <span
      className={`
        inline-flex items-center justify-center
        px-1 font-medium rounded-full
        ${variantStyle}
        ${sizeStyle}
      `}
    >
      {displayCount}
    </span>
  );
};

export default Badge;






