/**
 * Tabs 标签页组件
 * 高端简约现代艺术画廊风格
 */

import { createContext, useContext, useState, ReactNode, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: 'default' | 'pills' | 'underline';
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultTab?: string;
  value?: string;
  onChange?: (tab: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  children: ReactNode;
}

export const Tabs = ({
  defaultTab,
  value,
  onChange,
  variant = 'default',
  children,
}: TabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || '');
  const activeTab = value ?? internalActiveTab;

  const setActiveTab = (tab: string) => {
    if (onChange) {
      onChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      {children}
    </TabsContext.Provider>
  );
};

/**
 * Tab 列表容器
 */
interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const TabList = ({ children, className = '', ...props }: TabListProps) => {
  const context = useContext(TabsContext);
  if (!context) return null;

  const variantStyles = {
    default: 'flex gap-sm overflow-x-auto hide-scrollbar pb-sm',
    pills: 'flex gap-xs overflow-x-auto hide-scrollbar p-xs bg-gallery-gray rounded-card',
    underline: 'flex gap-lg border-b border-silk-gray',
  };

  return (
    <div className={`${variantStyles[context.variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * 单个 Tab
 */
interface TabProps {
  value: string;
  children: ReactNode;
}

export const Tab = ({ value, children }: TabProps) => {
  const context = useContext(TabsContext);
  if (!context) return null;

  const isActive = context.activeTab === value;

  const baseStyles = 'relative flex-shrink-0 font-sans transition-all duration-subtle';

  const variantStyles = {
    default: `
      px-4 py-2 text-caption tracking-wider
      border-hairline rounded-gallery
      ${isActive
        ? 'bg-deep-black border-deep-black text-pure-white'
        : 'border-silk-gray text-charcoal hover:border-stone-gray'
      }
    `,
    pills: `
      px-4 py-2 text-caption tracking-wider rounded-gallery
      ${isActive
        ? 'bg-pure-white text-deep-black shadow-subtle'
        : 'text-charcoal hover:text-ink-black'
      }
    `,
    underline: `
      pb-3 text-caption tracking-wider
      ${isActive ? 'text-deep-black' : 'text-stone-gray hover:text-charcoal'}
    `,
  };

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={`${baseStyles} ${variantStyles[context.variant]}`}
    >
      {children}
      {context.variant === 'underline' && isActive && (
        <motion.div
          layoutId="tab-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-champagne-gold"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};

/**
 * Tab 面板
 */
interface TabPanelProps {
  value: string;
  children: ReactNode;
}

export const TabPanel = ({ value, children }: TabPanelProps) => {
  const context = useContext(TabsContext);
  if (!context) return null;

  if (context.activeTab !== value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

export default Tabs;






