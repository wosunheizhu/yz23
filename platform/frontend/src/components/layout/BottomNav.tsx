/**
 * BottomNav 底部导航组件
 * 高端简约现代艺术画廊风格
 * 
 * 设计规范：
 * - 高度：56px
 * - 背景：纯白
 * - 分隔：顶部0.5px细线
 * - 图标：1px描边线性图标
 * - 文字：10px，letter-spacing: 0.1em
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { inboxApi } from '@/api/inbox';
import {
  Home,
  Compass,
  Plus,
  MessageSquare,
  User,
  Users,
  FileText,
  Calendar,
  Coins,
  UserCheck,
} from 'lucide-react';
import { CountBadge } from '../ui/Badge';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: '首页',
    icon: <Home size={22} strokeWidth={1} />,
    activeIcon: <Home size={22} strokeWidth={1.5} />,
  },
  {
    path: '/discover',
    label: '发现',
    icon: <Compass size={22} strokeWidth={1} />,
    activeIcon: <Compass size={22} strokeWidth={1.5} />,
  },
  {
    path: '/inbox',
    label: '消息',
    icon: <MessageSquare size={22} strokeWidth={1} />,
    activeIcon: <MessageSquare size={22} strokeWidth={1.5} />,
  },
  {
    path: '/profile',
    label: '我的',
    icon: <User size={22} strokeWidth={1} />,
    activeIcon: <User size={22} strokeWidth={1.5} />,
  },
];

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  path: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'onsite-visit',
    icon: <UserCheck size={20} strokeWidth={1.5} />,
    label: '记录线下到访',
    description: '记录邀请到公司的访客，可申请Token奖励',
    path: '/onsite-visits/create',
  },
  {
    id: 'network',
    icon: <Users size={20} strokeWidth={1.5} />,
    label: '人脉资源引荐',
    description: '记录您为元征带来的人脉资源',
    path: '/network-resources/create',
  },
  {
    id: 'demand',
    icon: <FileText size={20} strokeWidth={1.5} />,
    label: '发布需求',
    description: '发布项目相关需求',
    path: '/demands/create',
  },
  {
    id: 'booking',
    icon: <Calendar size={20} strokeWidth={1.5} />,
    label: '场地预约',
    description: '预约会议室',
    path: '/bookings/create',
  },
  {
    id: 'token',
    icon: <Coins size={20} strokeWidth={1.5} />,
    label: 'Token 转账',
    description: '发起 Token 转账',
    path: '/token/transfer',
  },
];

interface BottomNavProps {
  messageCount?: number;
}

export const BottomNav = ({ messageCount: propMessageCount }: BottomNavProps) => {
  const navigate = useNavigate();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 自动获取消息未读数
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const stats = await inboxApi.getStats();
        setUnreadCount(stats.unread || 0);
      } catch (error) {
        console.error('获取消息未读数失败:', error);
      }
    };

    loadUnreadCount();
    
    // 每30秒刷新一次
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 如果传入了有效的 propMessageCount（大于0），使用它；否则使用自己获取的值
  // 注意：undefined 使用自己获取的值，0 也使用自己获取的值
  const messageCount = (propMessageCount !== undefined && propMessageCount > 0) 
    ? propMessageCount 
    : unreadCount;

  const handleQuickAction = (action: QuickAction) => {
    setIsActionSheetOpen(false);
    navigate(action.path);
  };

  return (
    <>
      {/* 底部导航 */}
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-pure-white border-t border-silk-gray
          pb-safe
        "
      >
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {/* 首页 */}
          <NavItem item={navItems[0]} />

          {/* 发现 */}
          <NavItem item={navItems[1]} />

          {/* 中间加号按钮 */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsActionSheetOpen(true)}
            className="
              flex items-center justify-center
              w-12 h-12 -mt-5
              bg-deep-black rounded-full
              text-pure-white
              shadow-elevated
              transition-colors hover:bg-ink-black
            "
            aria-label="快捷操作"
          >
            <Plus size={24} strokeWidth={1.5} />
          </motion.button>

          {/* 消息 */}
          <NavItem item={{ ...navItems[2], badge: messageCount }} />

          {/* 我的 */}
          <NavItem item={navItems[3]} />
        </div>
      </nav>

      {/* 快捷动作面板 */}
      <AnimatePresence>
        {isActionSheetOpen && (
          <div className="fixed inset-0 z-50">
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-deep-black/40 backdrop-blur-sm"
              onClick={() => setIsActionSheetOpen(false)}
            />

            {/* 内容 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-pure-white rounded-t-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* 拖拽指示条 */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-silk-gray rounded-full" />
              </div>

              {/* 标题 */}
              <div className="px-lg pb-md">
                <h3 className="font-serif-cn text-title text-deep-black">快捷操作</h3>
              </div>

              {/* 操作列表 */}
              <div className="px-md pb-lg space-y-sm">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickAction(action)}
                    className="
                      w-full flex items-start gap-md p-md
                      rounded-card
                      hover:bg-off-white active:bg-gallery-gray
                      transition-colors text-left
                    "
                  >
                    <div className="
                      w-10 h-10 rounded-full
                      bg-champagne-gold/10
                      flex items-center justify-center
                      text-champagne-gold
                    ">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-sans font-medium text-body text-ink-black">
                        {action.label}
                      </div>
                      <div className="text-caption text-stone-gray">
                        {action.description}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* 取消按钮 */}
              <div className="px-md pb-md">
                <button
                  onClick={() => setIsActionSheetOpen(false)}
                  className="
                    w-full py-3 text-center
                    text-charcoal bg-gallery-gray rounded-card
                    active:bg-silk-gray transition-colors
                  "
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * 单个导航项
 */
const NavItem = ({ item }: { item: NavItem }) => {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `
        relative flex flex-col items-center justify-center
        px-3 py-2
        transition-colors duration-200
        ${isActive ? 'text-deep-black' : 'text-stone-gray'}
      `}
    >
      {({ isActive }) => (
        <>
          {isActive ? item.activeIcon || item.icon : item.icon}
          <span className="text-[10px] tracking-[0.1em] mt-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1 right-0">
              <CountBadge count={item.badge} size="sm" />
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export default BottomNav;
