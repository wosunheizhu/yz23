/**
 * Modal 模态框组件
 * 高端简约现代艺术画廊风格
 */

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showClose?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full mx-4',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showClose = true,
}: ModalProps) => {
  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-deep-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={`
              relative w-full ${sizeStyles[size]}
              bg-pure-white rounded-card shadow-elevated
              max-h-[90vh] overflow-hidden flex flex-col
            `}
          >
            {/* 头部 */}
            {(title || showClose) && (
              <div className="flex items-center justify-between p-lg border-b border-silk-gray">
                {title && (
                  <h2 className="font-serif-cn text-title text-deep-black">{title}</h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center text-stone-gray hover:text-charcoal transition-colors"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-lg">{children}</div>

            {/* 底部 */}
            {footer && (
              <div className="p-lg border-t border-silk-gray">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Action Sheet 底部操作面板
 */
interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const ActionSheet = ({ isOpen, onClose, title, children }: ActionSheetProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-deep-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 内容 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-pure-white rounded-t-2xl safe-bottom"
          >
            {/* 拖拽指示条 */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-silk-gray rounded-full" />
            </div>

            {/* 标题 */}
            {title && (
              <div className="px-lg pb-md">
                <h3 className="font-serif-cn text-title text-deep-black">{title}</h3>
              </div>
            )}

            {/* 内容 */}
            <div className="px-lg pb-lg max-h-[70vh] overflow-y-auto">{children}</div>

            {/* 取消按钮 */}
            <div className="px-lg pb-lg">
              <button
                onClick={onClose}
                className="w-full py-3 text-center text-charcoal bg-gallery-gray rounded-gallery active:bg-silk-gray transition-colors"
              >
                取消
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * 确认对话框
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showClose={false}
      footer={
        <div className="flex gap-md">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-body text-charcoal">{message}</p>
    </Modal>
  );
};

export default Modal;






