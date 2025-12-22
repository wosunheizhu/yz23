/**
 * Card 卡片组件
 * 高端简约现代艺术画廊风格
 */

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'dark' | 'featured';
  interactive?: boolean;
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-pure-white border-hairline border-silk-gray',
  elevated: 'bg-pure-white shadow-soft',
  dark: 'bg-deep-black border-hairline border-charcoal',
  featured: 'bg-pure-white border-hairline border-champagne-gold/30',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    const Component = interactive ? motion.div : 'div';
    const motionProps = interactive
      ? {
          whileTap: { scale: 0.995 },
          transition: { duration: 0.1 },
        }
      : {};

    return (
      <Component
        ref={ref}
        className={`
          rounded-gallery overflow-hidden
          ${variantStyles[variant]}
          ${interactive ? 'cursor-pointer active:opacity-90' : ''}
          ${className}
        `}
        {...motionProps}
        {...(props as HTMLMotionProps<'div'>)}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

/**
 * 卡片头部
 */
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-lg ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * 卡片内容
 */
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-lg ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * 卡片底部
 */
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-lg border-t border-silk-gray ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/**
 * 带视觉区的卡片
 */
interface FeaturedCardProps {
  visual?: ReactNode;
  badge?: ReactNode;
  title: string;
  subtitle?: string;
  metrics?: Array<{ label: string; value: string; primary?: boolean }>;
  footer?: ReactNode;
  onClick?: () => void;
}

export const FeaturedCard = ({
  visual,
  badge,
  title,
  subtitle,
  metrics,
  footer,
  onClick,
}: FeaturedCardProps) => {
  return (
    <Card interactive={!!onClick} onClick={onClick} className="overflow-hidden">
      {/* 视觉区 */}
      {visual && (
        <div className="relative h-40 bg-gradient-to-br from-gallery-gray to-off-white overflow-hidden">
          {visual}
          {badge && (
            <div className="absolute top-4 left-4">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div className="p-xl">
        {subtitle && (
          <span className="inline-block text-tiny tracking-widest uppercase text-stone-gray mb-md">
            {subtitle}
          </span>
        )}
        <h3 className="font-serif-cn text-subtitle text-deep-black leading-relaxed mb-md">
          {title}
        </h3>
        <div className="w-6 h-px bg-champagne-gold mb-lg" />

        {/* 指标 */}
        {metrics && metrics.length > 0 && (
          <div className="flex gap-xl">
            {metrics.map((metric, index) => (
              <div key={index} className="flex flex-col gap-xs">
                <span
                  className={`font-display ${
                    metric.primary
                      ? 'text-display-md text-champagne-gold'
                      : 'text-subtitle text-deep-black'
                  }`}
                >
                  {metric.value}
                </span>
                <span className="text-tiny tracking-wider text-stone-gray">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部 */}
      {footer && (
        <div className="px-xl pb-xl pt-md border-t border-silk-gray">
          {footer}
        </div>
      )}
    </Card>
  );
};

/**
 * 列表卡片
 */
interface ListCardProps {
  type?: string;
  status?: ReactNode;
  title: string;
  metrics?: Array<{ label: string; value: string; primary?: boolean }>;
  progress?: { value: number; text: string; subtext?: string };
  footer?: ReactNode;
  onClick?: () => void;
}

export const ListCard = ({
  type,
  status,
  title,
  metrics,
  progress,
  footer,
  onClick,
}: ListCardProps) => {
  return (
    <Card interactive={!!onClick} onClick={onClick}>
      <div className="p-xl">
        {/* 头部 */}
        {(type || status) && (
          <div className="flex justify-between items-center mb-md">
            {type && (
              <span className="text-tiny tracking-widest uppercase text-stone-gray">
                {type}
              </span>
            )}
            {status}
          </div>
        )}

        {/* 标题 */}
        <h3 className="font-serif-cn text-subtitle text-deep-black leading-relaxed mb-md">
          {title}
        </h3>
        <div className="w-6 h-px bg-champagne-gold mb-lg" />

        {/* 指标 */}
        {metrics && metrics.length > 0 && (
          <div className="flex gap-2xl mb-lg">
            {metrics.map((metric, index) => (
              <div key={index} className="flex flex-col gap-xs">
                <span
                  className={`font-display ${
                    metric.primary
                      ? 'text-display-md text-champagne-gold'
                      : 'text-subtitle text-deep-black'
                  }`}
                >
                  {metric.value}
                </span>
                <span className="text-tiny tracking-wider text-stone-gray">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 进度条 */}
        {progress && (
          <div className="mb-lg">
            <div className="h-0.5 bg-silk-gray mb-sm overflow-hidden">
              <div
                className="h-full bg-champagne-gold transition-all duration-700"
                style={{ width: `${progress.value}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-caption tracking-wider text-charcoal">
                {progress.text}
              </span>
              {progress.subtext && (
                <span className="text-tiny tracking-wider text-stone-gray">
                  {progress.subtext}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      {footer && (
        <div className="px-xl pb-xl pt-md border-t border-silk-gray">
          {footer}
        </div>
      )}
    </Card>
  );
};

export default Card;






