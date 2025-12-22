/**
 * Loading 加载组件
 * 高端简约现代艺术画廊风格
 */

import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'gold';
  text?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
};

const variantStyles = {
  light: 'border-stone-gray border-t-charcoal',
  dark: 'border-charcoal border-t-pure-white',
  gold: 'border-champagne-gold/30 border-t-champagne-gold',
};

export const Loading = ({ size = 'md', variant = 'gold', text }: LoadingProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          rounded-full animate-spin
          ${sizeStyles[size]}
          ${variantStyles[variant]}
        `}
      />
      {text && (
        <p className="text-caption text-stone-gray">{text}</p>
      )}
    </div>
  );
};

/**
 * 全屏加载遮罩
 */
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  variant?: 'light' | 'dark';
}

export const LoadingOverlay = ({
  visible,
  text = '加载中...',
  variant = 'light',
}: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${variant === 'light' ? 'bg-pure-white/80' : 'bg-deep-black/80'}
        backdrop-blur-sm
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          {/* 外圈 */}
          <div className="absolute inset-0 border border-champagne-gold/30 rounded-full" />
          {/* 旋转指示器 */}
          <div className="absolute inset-0 border-2 border-transparent border-t-champagne-gold rounded-full animate-spin" />
        </div>
        <p className={`text-caption ${variant === 'light' ? 'text-charcoal' : 'text-stone-gray'}`}>
          {text}
        </p>
      </div>
    </motion.div>
  );
};

/**
 * 骨架屏
 */
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = ({
  width,
  height,
  variant = 'text',
  className = '',
  style,
  ...props
}: SkeletonProps) => {
  const variantStyles = {
    text: 'rounded-gallery',
    circular: 'rounded-full',
    rectangular: 'rounded-gallery',
  };

  const defaultHeight = variant === 'text' ? '1em' : height;

  return (
    <div
      className={`
        bg-gradient-to-r from-gallery-gray via-silk-gray to-gallery-gray
        animate-pulse
        ${variantStyles[variant]}
        ${className}
      `}
      style={{
        width: width ?? '100%',
        height: defaultHeight,
        ...style,
      }}
      {...props}
    />
  );
};

/**
 * 骨架卡片
 */
export const SkeletonCard = () => {
  return (
    <div className="bg-pure-white border-hairline border-silk-gray rounded-gallery p-xl space-y-lg">
      <div className="flex items-center gap-md">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-sm">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={60} />
      <div className="flex gap-xl">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  );
};

export default Loading;






