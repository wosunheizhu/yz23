/**
 * 管理员控制台首页
 * PRD 22: 管理员控制台
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Coins,
  Calendar,
  Bell,
  FileText,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Gift,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Loading } from '../../components/ui';
import {
  getDashboardStats,
  getQuickActions,
  DashboardStatsResponse,
  QuickActionsResponse,
} from '../../api/admin';
import { useAuthStore } from '../../stores/authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// 管理菜单配置
const adminMenus = [
  { id: 'projects', icon: <Briefcase size={20} />, label: '项目管理', path: '/admin/projects', desc: '项目审核、状态管理', badgeKey: 'pendingProjects' as const },
  { id: 'users', icon: <Users size={20} />, label: '用户管理', path: '/admin/users', desc: '合伙人账号管理' },
  { id: 'tokens', icon: <Coins size={20} />, label: 'Token 管理', path: '/admin/tokens', desc: '转账审核', badgeKey: 'pendingTokens' as const },
  { id: 'token-grants', icon: <Gift size={20} />, label: 'Token 发放任务', path: '/admin/token-grant-tasks', desc: '座谈会嘉宾、线下到访奖励', badgeKey: 'pendingGrants' as const },
  { id: 'venues', icon: <Calendar size={20} />, label: '场地管理', path: '/admin/venues', desc: '场地、预约、座谈会' },
  // 通知管理功能暂时禁用
  // { id: 'notifications', icon: <Bell size={20} />, label: '通知管理', path: '/admin/notifications', desc: '邮件队列、发送状态', badgeKey: 'failedEmails' as const },
  { id: 'feedbacks', icon: <FileText size={20} />, label: '反馈处理', path: '/admin/feedbacks', desc: '用户反馈、意见建议', badgeKey: 'pendingFeedbacks' as const },
  { id: 'announcements', icon: <FileText size={20} />, label: '公告管理', path: '/admin/announcements', desc: '发布、编辑公告' },
  { id: 'settings', icon: <Settings size={20} />, label: '系统设置', path: '/admin/settings', desc: 'Token 配置、系统参数' },
];

// 获取菜单项的未处理数量
const getMenuBadgeCount = (badgeKey: string | undefined, quickActions: QuickActionsResponse | null): number => {
  if (!badgeKey || !quickActions) return 0;
  switch (badgeKey) {
    case 'pendingProjects':
      return quickActions.pendingProjects || 0;
    case 'pendingTokens':
      return quickActions.pendingTransfers || 0;
    case 'pendingGrants':
      return quickActions.pendingGrants || 0;
    // 通知管理功能暂时禁用
    // case 'failedEmails':
    //   return quickActions.failedEmails || 0;
    case 'pendingFeedbacks':
      return quickActions.pendingFeedbacks || 0;
    default:
      return 0;
  }
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActionsResponse | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, actionsData] = await Promise.all([
        getDashboardStats(),
        getQuickActions(),
      ]);
      setStats(statsData);
      setQuickActions(actionsData);
    } catch (err) {
      console.error('加载管理数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 非管理员跳转
    if (user && !user.isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadData();
  }, [user, loadData]);

  // 当返回到管理控制台时刷新数据
  useEffect(() => {
    if (location.pathname === '/admin') {
      loadData();
    }
  }, [location.pathname, loadData]);

  if (loading) {
    return (
      <SimpleLayout title="管理控制台" backPath="/profile">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="管理控制台" backPath="/profile">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 待处理事项 */}
        {quickActions && (quickActions.pendingProjects > 0 || quickActions.pendingTransfers > 0 || quickActions.pendingGrants > 0 || quickActions.pendingArbitrations > 0 || quickActions.failedEmails > 0 || quickActions.pendingFeedbacks > 0) && (
          <motion.section variants={itemVariants}>
            <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-sm px-sm">
              待处理事项
            </h3>
            <Card className="p-lg">
              <div className="grid grid-cols-2 gap-md">
                {quickActions.pendingProjects > 0 && (
                  <button
                    onClick={() => navigate('/admin/projects?status=pending')}
                    className="flex items-center gap-md p-md bg-warning/10 rounded-lg"
                  >
                    <AlertTriangle size={20} className="text-warning" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-deep-black">{quickActions.pendingProjects}</p>
                      <p className="text-xs text-stone-gray">待审核项目</p>
                    </div>
                  </button>
                )}
                {quickActions.pendingTransfers > 0 && (
                  <button
                    onClick={() => navigate('/admin/tokens?tab=transfers')}
                    className="flex items-center gap-md p-md bg-info/10 rounded-lg"
                  >
                    <Clock size={20} className="text-info" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-deep-black">{quickActions.pendingTransfers}</p>
                      <p className="text-xs text-stone-gray">待审核转账</p>
                    </div>
                  </button>
                )}
                {quickActions.pendingGrants > 0 && (
                  <button
                    onClick={() => navigate('/admin/token-grant-tasks?status=PENDING')}
                    className="flex items-center gap-md p-md bg-success/10 rounded-lg"
                  >
                    <Coins size={20} className="text-success" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-deep-black">{quickActions.pendingGrants}</p>
                      <p className="text-xs text-stone-gray">待发放奖励</p>
                    </div>
                  </button>
                )}
                {quickActions.pendingArbitrations > 0 && (
                  <button
                    onClick={() => navigate('/admin/responses')}
                    className="flex items-center gap-md p-md bg-error/10 rounded-lg"
                  >
                    <AlertTriangle size={20} className="text-error" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-deep-black">{quickActions.pendingArbitrations}</p>
                      <p className="text-xs text-stone-gray">待裁决响应</p>
                    </div>
                  </button>
                )}
                {/* 通知管理功能暂时禁用 */}
                {quickActions.pendingFeedbacks > 0 && (
                  <button
                    onClick={() => navigate('/admin/feedbacks')}
                    className="flex items-center gap-md p-md bg-info/10 rounded-lg"
                  >
                    <FileText size={20} className="text-info" />
                    <div className="text-left">
                      <p className="text-lg font-semibold text-deep-black">{quickActions.pendingFeedbacks}</p>
                      <p className="text-xs text-stone-gray">待处理反馈</p>
                    </div>
                  </button>
                )}
              </div>
            </Card>
          </motion.section>
        )}

        {/* 数据概览 */}
        {stats && (
          <motion.section variants={itemVariants}>
            <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-sm px-sm">
              数据概览
            </h3>
            <div className="grid grid-cols-2 gap-md">
              <Card className="p-md">
                <div className="flex items-center justify-between mb-2">
                  <Users size={18} className="text-champagne-gold" />
                  <Badge variant="outline" size="sm">本周活跃 {stats.users.activeThisWeek}</Badge>
                </div>
                <p className="text-2xl font-semibold text-deep-black">{stats.users.total}</p>
                <p className="text-xs text-stone-gray">合伙人总数</p>
              </Card>
              
              <Card className="p-md">
                <div className="flex items-center justify-between mb-2">
                  <Briefcase size={18} className="text-champagne-gold" />
                  <Badge variant="outline" size="sm">进行中 {stats.projects.active}</Badge>
                </div>
                <p className="text-2xl font-semibold text-deep-black">{stats.projects.total}</p>
                <p className="text-xs text-stone-gray">项目总数</p>
              </Card>

              <Card className="p-md">
                <div className="flex items-center justify-between mb-2">
                  <Coins size={18} className="text-champagne-gold" />
                  <TrendingUp size={14} className="text-success" />
                </div>
                <p className="text-2xl font-semibold text-deep-black">{stats.tokens.totalCirculation.toLocaleString()}</p>
                <p className="text-xs text-stone-gray">Token 流通量</p>
              </Card>

              <Card className="p-md">
                <div className="flex items-center justify-between mb-2">
                  <Calendar size={18} className="text-champagne-gold" />
                  <Badge variant="outline" size="sm">今日 {stats.venues.todayBookings}</Badge>
                </div>
                <p className="text-2xl font-semibold text-deep-black">{stats.venues.weekBookings}</p>
                <p className="text-xs text-stone-gray">本周预约</p>
              </Card>
            </div>
          </motion.section>
        )}

        {/* 管理功能入口 */}
        <motion.section variants={itemVariants}>
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-sm px-sm">
            管理功能
          </h3>
          <Card className="divide-y divide-silk-gray">
            {adminMenus.map((menu) => {
              const badgeCount = getMenuBadgeCount(menu.badgeKey, quickActions);
              return (
                <button
                  key={menu.id}
                  onClick={() => navigate(menu.path)}
                  className="w-full flex items-center justify-between p-lg hover:bg-off-white active:bg-gallery-gray transition-colors"
                >
                  <div className="flex items-center gap-md">
                    <div className="relative">
                      <span className="text-champagne-gold">{menu.icon}</span>
                      {badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-error text-white text-xs rounded-full flex items-center justify-center">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-body text-deep-black">{menu.label}</p>
                      <p className="text-tiny text-stone-gray">{menu.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    {badgeCount > 0 && (
                      <Badge variant="destructive" size="sm">{badgeCount} 待处理</Badge>
                    )}
                    <ChevronRight size={16} className="text-stone-gray" />
                  </div>
                </button>
              );
            })}
          </Card>
        </motion.section>

        {/* 通知管理功能暂时禁用 */}
      </motion.div>
    </SimpleLayout>
  );
}

