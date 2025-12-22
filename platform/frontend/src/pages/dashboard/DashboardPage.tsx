/**
 * 仪表盘页面
 * 元征 · 合伙人赋能平台
 * 
 * 高端简约现代艺术画廊风格
 * - 极致留白
 * - 精准克制
 * - 微妙层次
 * - 艺术质感
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Badge, Avatar, Loading } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { dashboardApi, MyProjectSummary, MyTodoItem, TokenSummary, MyContributionStats, InboxBadge } from '../../api/dashboard';

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// 角色等级中文映射
const roleLevelMap: Record<string, string> = {
  FOUNDER: '联合创始人',
  CORE_PARTNER: '核心合伙人',
  PARTNER: '普通合伙人',
};

// 业务状态中文映射
const businessStatusMap: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: '进行中', color: 'text-success' },
  PAUSED: { label: '暂停', color: 'text-warning' },
  COMPLETED: { label: '已完成', color: 'text-stone-gray' },
  CLOSED: { label: '已关闭', color: 'text-stone-gray' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // 数据状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<MyProjectSummary[]>([]);
  const [todos, setTodos] = useState<MyTodoItem[]>([]);
  const [tokenSummary, setTokenSummary] = useState<TokenSummary | null>(null);
  const [contributions, setContributions] = useState<MyContributionStats | null>(null);
  const [inboxBadge, setInboxBadge] = useState<InboxBadge | null>(null);

  // 加载数据
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 并行加载所有数据
        const [projectsRes, todosRes, tokenRes, contribRes, inboxRes] = await Promise.allSettled([
          dashboardApi.getProjects(5),
          dashboardApi.getTodos(5),
          dashboardApi.getTokenSummary(5),
          dashboardApi.getContributions(),
          dashboardApi.getInboxBadge(),
        ]);

        // 处理结果
        if (projectsRes.status === 'fulfilled') {
          setProjects(projectsRes.value.data?.data || []);
        }
        if (todosRes.status === 'fulfilled') {
          setTodos(todosRes.value.data?.data || []);
        }
        if (tokenRes.status === 'fulfilled') {
          setTokenSummary(tokenRes.value.data);
        }
        if (contribRes.status === 'fulfilled') {
          setContributions(contribRes.value.data);
        }
        if (inboxRes.status === 'fulfilled') {
          setInboxBadge(inboxRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  // 待办事项类型图标
  const getTodoIcon = (type: string, _isAdmin?: boolean) => {
    // 管理员待办使用红色标识
    const adminColor = 'text-error';
    switch (type) {
      case 'RESPONSE_REVIEW':
        return <AlertCircle size={16} className="text-warning" />;
      case 'TOKEN_CONFIRM':
        return <CheckCircle size={16} className="text-success" />;
      case 'MEETING_MINUTES':
        return <Clock size={16} className="text-info" />;
      case 'JOIN_REQUEST':
        return <Users size={16} className="text-info" />;
      case 'UNREAD_MESSAGE':
        return <AlertCircle size={16} className="text-champagne-gold" />;
      case 'ADMIN_PROJECT_REVIEW':
        return <Briefcase size={16} className={adminColor} />;
      case 'ADMIN_TOKEN_REVIEW':
        return <TrendingUp size={16} className={adminColor} />;
      case 'ADMIN_GRANT_TASK':
        return <CheckCircle size={16} className={adminColor} />;
      default:
        return <AlertCircle size={16} className="text-stone-gray" />;
    }
  };

  if (loading) {
    return (
      <AppLayout
        header={{
          showLogo: true,
          showSearch: true,
          showNotification: true,
          notificationCount: 0,
        }}
      >
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      header={{
        showLogo: true,
        showSearch: true,
        showNotification: true,
        notificationCount: inboxBadge?.total || 0,
        onSearch: () => navigate('/search'),
        onNotification: () => navigate('/inbox'),
      }}
      messageCount={inboxBadge?.total || 0}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 错误提示 */}
        {error && (
          <motion.div variants={itemVariants} className="bg-error/10 border border-error/30 rounded-gallery p-4 text-error text-sm">
            {error}
          </motion.div>
        )}

        {/* 问候语 & 用户信息 */}
        <motion.section variants={itemVariants}>
          <div className="flex items-start justify-between mb-md">
            <div className="flex items-center gap-md">
              <Avatar name={user?.name || ''} src={user?.avatarUrl} size="lg" />
              <div>
                <p className="text-caption text-stone-gray">{getTimeGreeting()}</p>
                <h2 className="font-serif-cn text-title text-deep-black">{user?.name}</h2>
              </div>
            </div>
            <Badge variant="new">{roleLevelMap[user?.roleLevel || 'PARTNER']}</Badge>
          </div>
        </motion.section>

        {/* Token 卡片 - 深色画廊展示 */}
        <motion.section variants={itemVariants}>
          <Card variant="dark" className="p-xl" onClick={() => navigate('/token')}>
            <p className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-xs">
              Token 余额
            </p>
            <p className="font-display text-display-xl text-champagne-gold">
              {(tokenSummary?.balance || 0).toLocaleString()}
            </p>
            
            {/* 分隔线 */}
            <div className="w-8 h-px bg-charcoal my-lg" />
            
            {/* 最近交易 */}
            {tokenSummary?.recentTransactions && tokenSummary.recentTransactions.length > 0 && (
              <div className="flex gap-xl">
                {tokenSummary.recentTransactions.slice(0, 2).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-sm">
                    {tx.amount > 0 ? (
                      <ArrowUpRight size={14} className="text-success" />
                    ) : (
                      <ArrowDownRight size={14} className="text-pure-white/60" />
                    )}
                    <span className="text-caption text-stone-gray">{tx.reason || '交易'}</span>
                    <span className={`text-caption ${tx.amount > 0 ? 'text-success' : 'text-pure-white/80'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.section>

        {/* 待办事项 */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-md">
            <h3 className="section-title">待办事项</h3>
          </div>
          
          {todos.length === 0 ? (
            <Card className="p-lg text-center">
              <p className="text-stone-gray text-sm">暂无待办事项</p>
            </Card>
          ) : (
            <div className="space-y-sm">
              {todos.map((todo) => (
                <Card
                  key={todo.id}
                  interactive
                  onClick={() => {
                    // 优先使用 path 字段，否则根据类型跳转
                    if (todo.path) {
                      navigate(todo.path);
                    } else if (todo.type === 'RESPONSE_REVIEW') {
                      navigate(`/demands/${todo.relatedId}`);
                    } else if (todo.type === 'TOKEN_CONFIRM') {
                      navigate('/token');
                    } else if (todo.type === 'MEETING_MINUTES') {
                      navigate(`/meetings/${todo.relatedId}`);
                    } else if (todo.type === 'JOIN_REQUEST') {
                      navigate(`/projects/${todo.projectId}`);
                    } else if (todo.type === 'UNREAD_MESSAGE') {
                      navigate(`/messages/${todo.relatedId}`);
                    } else if (todo.type?.startsWith('ADMIN_')) {
                      navigate('/admin');
                    }
                  }}
                  className={`p-md ${todo.isAdmin ? 'border-l-2 border-l-error' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-md flex-1 min-w-0">
                      {todo.isNew && (
                        <span className="w-2 h-2 bg-error rounded-full animate-pulse flex-shrink-0" />
                      )}
                      {getTodoIcon(todo.type, todo.isAdmin)}
                      <div className="min-w-0 flex-1">
                        <span className="text-body text-ink-black truncate block">{todo.title}</span>
                        {todo.description && (
                          <span className="text-caption text-stone-gray truncate block">{todo.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-sm flex-shrink-0 ml-md">
                      {todo.isAdmin && (
                        <span className="text-tiny text-error">管理</span>
                      )}
                      <span className="text-tiny text-stone-gray">
                        {new Date(todo.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.section>

        {/* 我的项目 - 横向滚动画廊 */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-md">
            <h3 className="section-title">我的项目</h3>
            <button 
              onClick={() => navigate('/projects')}
              className="text-caption text-stone-gray hover:text-champagne-gold transition-colors flex items-center gap-xs"
            >
              全部项目 <ChevronRight size={14} />
            </button>
          </div>
          
          {projects.length === 0 ? (
            <Card className="p-lg text-center">
              <p className="text-stone-gray text-sm">暂无参与的项目</p>
            </Card>
          ) : (
            <div className="flex gap-md overflow-x-auto hide-scrollbar -mx-lg px-lg pb-sm">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  interactive
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="min-w-[200px] max-w-[200px] p-lg relative flex-shrink-0"
                >
                  {(project.hasNewEvents || project.hasNewDemands || project.hasNewResponses) && (
                    <span className="absolute top-lg right-lg w-2 h-2 bg-champagne-gold rounded-full" />
                  )}
                  <Briefcase size={16} className="text-stone-gray mb-md" strokeWidth={1} />
                  <p className="text-body text-deep-black font-serif-cn line-clamp-2 mb-md min-h-[2.8em]">
                    {project.name}
                  </p>
                  
                  {/* 角色标识 */}
                  <div className="flex justify-between items-center">
                    <span className={businessStatusMap[project.businessStatus]?.color || 'text-stone-gray'}>
                      <span className="text-tiny">{businessStatusMap[project.businessStatus]?.label || project.businessStatus}</span>
                    </span>
                    <span className="text-tiny text-champagne-gold">
                      {project.role === 'LEADER' ? '负责人' : '成员'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.section>

        {/* 我的贡献 - 网格展示 */}
        <motion.section variants={itemVariants}>
          <h3 className="section-title mb-md">我的贡献</h3>
          
          <div className="grid grid-cols-2 gap-md">
            <ContributionCard
              icon={<Users size={20} strokeWidth={1} />}
              value={contributions?.resources?.count || 0}
              label="人脉资源"
              onClick={() => navigate('/network-resources')}
            />
            <ContributionCard
              icon={<TrendingUp size={20} strokeWidth={1} />}
              value={contributions?.invitedGuests?.count || 0}
              label="邀请嘉宾"
              onClick={() => navigate('/my-invitations')}
            />
            <ContributionCard
              icon={<Briefcase size={20} strokeWidth={1} />}
              value={contributions?.leadProjects?.count || 0}
              label="领导项目"
              onClick={() => navigate('/projects?filter=lead')}
            />
            <ContributionCard
              icon={<Calendar size={20} strokeWidth={1} />}
              value={contributions?.memberProjects?.count || 0}
              label="参与项目"
              onClick={() => navigate('/projects?filter=member')}
            />
          </div>
        </motion.section>

        {/* 底部留白 */}
        <div className="h-lg" />
      </motion.div>
    </AppLayout>
  );
}

/**
 * 贡献统计卡片
 */
interface ContributionCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  onClick?: () => void;
}

const ContributionCard = ({ icon, value, label, onClick }: ContributionCardProps) => {
  return (
    <Card interactive={!!onClick} onClick={onClick} className="p-lg text-center">
      <div className="text-stone-gray mb-md flex justify-center">{icon}</div>
      <p className="font-display text-display-md text-deep-black">{value}</p>
      <p className="text-tiny text-stone-gray tracking-wider mt-xs">{label}</p>
    </Card>
  );
};
