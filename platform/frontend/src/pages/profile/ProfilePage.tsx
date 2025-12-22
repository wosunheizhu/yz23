/**
 * 个人中心页面
 * 元征 · 合伙人赋能平台
 * 
 * 高端简约现代艺术画廊风格
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Briefcase,
  Users,
  Coins,
  Calendar,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  Bell,
  MessageSquare,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Avatar, Badge, Loading } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { dashboardApi, DashboardResponse } from '../../api/dashboard';
import { apiClient } from '../../api/client';

// 角色等级映射
const ROLE_LEVEL_LABELS: Record<string, string> = {
  FOUNDER: '联合创始人',
  CORE_PARTNER: '核心合伙人',
  PARTNER: '合伙人',
};

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.get();
      setDashboard(response.data);
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  // 格式化数字
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0';
    return num.toLocaleString();
  };

  // 菜单项配置 - 使用真实数据
  const resourceCount = dashboard?.contributions?.resources?.count || 0;
  const projectCount = dashboard?.myProjects?.length || 0;
  const todoCount = dashboard?.myTodos?.length || 0;
  
  const menuSections = [
    {
      title: '我的资产',
      items: [
        { 
          id: 'token', 
          icon: <Coins size={20} strokeWidth={1} />, 
          label: 'Token 账户', 
          badge: formatNumber(dashboard?.tokenBalance), 
          path: '/token' 
        },
        { 
          id: 'network', 
          icon: <Users size={20} strokeWidth={1} />, 
          label: '我的人脉', 
          badge: formatNumber(resourceCount), 
          path: '/network-resources' 
        },
        { 
          id: 'projects', 
          icon: <Briefcase size={20} strokeWidth={1} />, 
          label: '我的项目', 
          badge: formatNumber(projectCount), 
          path: '/projects?filter=mine' 
        },
      ],
    },
    {
      title: '我的活动',
      items: [
        { 
          id: 'demands', 
          icon: <FileText size={20} strokeWidth={1} />, 
          label: '需求响应', 
          badge: formatNumber(todoCount),
          path: '/demands' 
        },
        { 
          id: 'calendar', 
          icon: <Calendar size={20} strokeWidth={1} />, 
          label: '日程安排', 
          path: '/calendar' 
        },
        { 
          id: 'bookings', 
          icon: <Calendar size={20} strokeWidth={1} />, 
          label: '场地预约', 
          path: '/bookings' 
        },
        { 
          id: 'feedback', 
          icon: <MessageSquare size={20} strokeWidth={1} />, 
          label: '意见反馈', 
          path: '/feedback' 
        },
      ],
    },
    {
      title: '设置',
      items: [
        { id: 'notification', icon: <Bell size={20} strokeWidth={1} />, label: '通知设置', path: '/settings/notification' },
        { id: 'privacy', icon: <Shield size={20} strokeWidth={1} />, label: '隐私设置', path: '/settings/privacy' },
        { id: 'settings', icon: <Settings size={20} strokeWidth={1} />, label: '账号设置', path: '/settings' },
      ],
    },
    {
      title: '其他',
      items: [
        { id: 'help', icon: <HelpCircle size={20} strokeWidth={1} />, label: '帮助与反馈', path: '/help' },
      ],
    },
  ];

  // 如果是管理员，添加管理员入口
  if (user?.isAdmin) {
    menuSections.unshift({
      title: '管理员',
      items: [
        { id: 'admin', icon: <Shield size={20} strokeWidth={1} />, label: '管理控制台', path: '/admin', badge: undefined },
      ],
    });
  }

  if (loading && !user) {
    return (
      <AppLayout header={{ title: '我的' }}>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      header={{
        title: '我的',
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 用户信息卡片 */}
        <motion.section variants={itemVariants}>
          <Card
            variant="dark"
            interactive
            onClick={() => navigate('/profile/edit')}
            className="p-xl"
          >
            <div className="flex items-center gap-lg">
              <Avatar name={user?.name || '用户'} src={user?.avatarUrl} size="xl" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm mb-xs">
                  <h2 className="font-serif-cn text-title text-pure-white truncate">
                    {user?.name || '未设置姓名'}
                  </h2>
                  <Badge variant="gold" size="sm">
                    {ROLE_LEVEL_LABELS[user?.roleLevel || ''] || '合伙人'}
                  </Badge>
                </div>
                <p className="text-caption text-stone-gray">{user?.email}</p>
              </div>
              <ChevronRight size={20} className="text-stone-gray" />
            </div>

            {/* 分隔线 */}
            <div className="h-px bg-charcoal my-lg" />

            {/* 贡献统计 */}
            <div className="flex justify-around">
              <div className="text-center">
                <p className="font-display text-title text-champagne-gold">
                  {dashboard?.contributions?.resources?.count || 0}
                </p>
                <p className="text-tiny text-stone-gray">人脉资源</p>
              </div>
              <div className="text-center">
                <p className="font-display text-title text-champagne-gold">
                  {dashboard?.contributions?.invitedGuests?.count || 0}
                </p>
                <p className="text-tiny text-stone-gray">邀请嘉宾</p>
              </div>
              <div className="text-center">
                <p className="font-display text-title text-champagne-gold">
                  {dashboard?.contributions?.leadProjects?.count || 0}
                </p>
                <p className="text-tiny text-stone-gray">领导项目</p>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* 菜单列表 */}
        {menuSections.map((section) => (
          <motion.section key={section.title} variants={itemVariants}>
            <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-sm px-sm">
              {section.title}
            </h3>
            <Card className="divide-y divide-silk-gray">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between p-lg hover:bg-off-white active:bg-gallery-gray transition-colors"
                >
                  <div className="flex items-center gap-md">
                    <span className="text-charcoal">{item.icon}</span>
                    <span className="text-body text-ink-black">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-sm">
                    {item.badge && item.badge !== '0' && (
                      <span className="text-caption text-champagne-gold">{item.badge}</span>
                    )}
                    <ChevronRight size={16} className="text-stone-gray" />
                  </div>
                </button>
              ))}
            </Card>
          </motion.section>
        ))}

        {/* 退出登录 */}
        <motion.section variants={itemVariants}>
          <Card interactive onClick={handleLogout} className="p-lg">
            <div className="flex items-center justify-center gap-sm text-error">
              <LogOut size={20} strokeWidth={1} />
              <span className="text-body">退出登录</span>
            </div>
          </Card>
        </motion.section>

        {/* 版本信息 */}
        <motion.section variants={itemVariants} className="text-center pb-lg">
          <p className="text-tiny text-stone-gray">
            元征 · 合伙人赋能平台
          </p>
          <p className="text-tiny text-stone-gray">
            Version 1.0.0
          </p>
        </motion.section>
      </motion.div>
    </AppLayout>
  );
}

export { ProfilePage };
