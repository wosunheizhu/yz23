/**
 * Button 按钮组件
 * 高端简约现代艺术画廊风格
 */

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-champagne-gold text-deep-black
    hover:bg-champagne-gold/90
    active:bg-champagne-gold/80
  `,
  secondary: `
    bg-transparent border border-champagne-gold text-champagne-gold
    hover:bg-champagne-gold/10
  `,
  outline: `
    bg-transparent border border-silk-gray text-charcoal
    hover:border-stone-gray hover:bg-gallery-gray
  `,
  ghost: `
    bg-transparent text-charcoal
    hover:text-ink-black hover:bg-gallery-gray
  `,
  danger: `
    bg-error/10 border border-error/30 text-error
    hover:bg-error/20
  `,
  dark: `
    bg-deep-black text-pure-white
    hover:bg-ink-black
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-caption',
  md: 'px-6 py-3 text-body',
  lg: 'px-8 py-4 text-subtitle',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        className={`
          inline-flex items-center justify-center gap-2
          font-sans font-medium tracking-wider
          rounded-gallery
          transition-all duration-subtle
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={isDisabled}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/**
 * 图标按钮
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'gold';
  badge?: number;
}

const iconSizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconVariantStyles = {
  default: 'text-charcoal hover:text-ink-black hover:bg-gallery-gray',
  ghost: 'text-stone-gray hover:text-charcoal',
  gold: 'text-champagne-gold hover:bg-champagne-gold/10',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', variant = 'default', badge, className = '', ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={`
          relative inline-flex items-center justify-center
          rounded-gallery transition-all duration-subtle
          ${iconSizeStyles[size]}
          ${iconVariantStyles[variant]}
          ${className}
        `}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-champagne-gold text-deep-black text-[10px] font-medium rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;

