/**
 * Avatar 头像组件
 * 高端简约现代艺术画廊风格
 */

import { HTMLAttributes } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  isOnline?: boolean;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; online: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', online: 'w-1.5 h-1.5 right-0 bottom-0' },
  sm: { container: 'w-8 h-8', text: 'text-tiny', online: 'w-2 h-2 right-0 bottom-0' },
  md: { container: 'w-10 h-10', text: 'text-caption', online: 'w-2.5 h-2.5 right-0 bottom-0' },
  lg: { container: 'w-12 h-12', text: 'text-body', online: 'w-3 h-3 right-0.5 bottom-0.5' },
  xl: { container: 'w-16 h-16', text: 'text-subtitle', online: 'w-3.5 h-3.5 right-1 bottom-1' },
};

// 根据名字生成颜色
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-champagne-gold',
    'bg-rose-gold',
    'bg-copper',
    'bg-platinum',
    'bg-charcoal',
    'bg-ink-black',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 获取名字首字母
const getInitials = (name: string): string => {
  if (!name) return '?';
  // 中文名取第一个字，英文名取前两个首字母
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.charAt(0);
  }
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const Avatar = ({
  src,
  name = '',
  size = 'md',
  showOnline = false,
  isOnline = false,
  className = '',
  ...props
}: AvatarProps) => {
  const sizeStyle = sizeStyles[size];
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);

  return (
    <div
      className={`
        relative inline-flex items-center justify-center
        rounded-full overflow-hidden
        ${sizeStyle.container}
        ${className}
      `}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={`
            w-full h-full flex items-center justify-center
            ${bgColor} text-pure-white font-display
            ${sizeStyle.text}
          `}
        >
          {initials}
        </div>
      )}

      {/* 在线状态 */}
      {showOnline && (
        <span
          className={`
            absolute rounded-full border-2 border-pure-white
            ${isOnline ? 'bg-success' : 'bg-stone-gray'}
            ${sizeStyle.online}
          `}
        />
      )}
    </div>
  );
};

/**
 * 头像组
 */
interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name: string }>;
  max?: number;
  size?: AvatarSize;
}

export const AvatarGroup = ({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const overlapStyles: Record<AvatarSize, string> = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  };

  return (
    <div className="flex items-center">
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className={`${index > 0 ? overlapStyles[size] : ''} ring-2 ring-pure-white rounded-full`}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${overlapStyles[size]} ring-2 ring-pure-white rounded-full
            ${sizeStyles[size].container}
            flex items-center justify-center
            bg-gallery-gray text-charcoal
            ${sizeStyles[size].text}
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default Avatar;






