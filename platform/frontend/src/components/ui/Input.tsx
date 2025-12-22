/**
 * Input 输入框组件
 * 高端简约现代艺术画廊风格
 */

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'light' | 'dark';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      variant = 'light',
      type = 'text',
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const baseStyles = variant === 'light'
      ? 'bg-pure-white border-silk-gray text-ink-black placeholder:text-stone-gray'
      : 'bg-deep-black border-charcoal text-pure-white placeholder:text-charcoal';

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-tiny tracking-widest uppercase text-stone-gray">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full border-hairline rounded-gallery
              px-4 py-3 text-body
              focus:border-champagne-gold focus:outline-none
              transition-all duration-subtle
              ${baseStyles}
              ${leftIcon ? 'pl-11' : ''}
              ${rightIcon || isPassword ? 'pr-11' : ''}
              ${error ? 'border-error' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-gray hover:text-charcoal transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          {!isPassword && rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-gray">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-tiny text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="text-tiny text-stone-gray">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea 文本域组件
 */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: 'light' | 'dark';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, variant = 'light', className = '', ...props }, ref) => {
    const baseStyles = variant === 'light'
      ? 'bg-pure-white border-silk-gray text-ink-black placeholder:text-stone-gray'
      : 'bg-deep-black border-charcoal text-pure-white placeholder:text-charcoal';

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-tiny tracking-widest uppercase text-stone-gray">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full border-hairline rounded-gallery
            px-4 py-3 text-body
            focus:border-champagne-gold focus:outline-none
            transition-all duration-subtle
            resize-none
            ${baseStyles}
            ${error ? 'border-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-tiny text-error">{error}</p>
        )}
        {hint && !error && (
          <p className="text-tiny text-stone-gray">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/**
 * 验证码输入框
 */
interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  variant?: 'light' | 'dark';
}

export const CodeInput = ({
  value,
  onChange,
  length = 6,
  error,
  variant = 'light',
}: CodeInputProps) => {
  const baseStyles = variant === 'light'
    ? 'bg-pure-white border-silk-gray text-ink-black'
    : 'bg-deep-black border-charcoal text-pure-white';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          maxLength={length}
          className={`
            w-full border-hairline rounded-gallery
            px-4 py-3 text-center text-title font-display tracking-[0.5em]
            focus:border-champagne-gold focus:outline-none
            transition-all duration-subtle
            ${baseStyles}
            ${error ? 'border-error' : ''}
          `}
          placeholder={'·'.repeat(length)}
        />
      </div>
      {error && (
        <p className="text-tiny text-error text-center">{error}</p>
      )}
    </div>
  );
};

export default Input;






