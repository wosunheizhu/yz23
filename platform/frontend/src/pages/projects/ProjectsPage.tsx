/**
 * 项目列表页面
 * 元征 · 合伙人赋能平台
 * 
 * 高端简约现代艺术画廊风格
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  MapPin,
  Calendar,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Badge, Tabs, TabList, Tab, Input, Button, Empty, Loading } from '../../components/ui';
import { getProjects, ProjectListItem, BUSINESS_STATUS_LABELS, REVIEW_STATUS_LABELS, BUSINESS_TYPE_LABELS } from '../../api/projects';
// 状态样式映射
const businessStatusMap: Record<string, { variant: 'success' | 'warning' | 'default' | 'gold' }> = {
  ONGOING: { variant: 'success' },
  PAUSED: { variant: 'warning' },
  COMPLETED: { variant: 'gold' },
  ABANDONED: { variant: 'default' },
};

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // 根据 URL 参数设置默认标签
  const getInitialTab = () => {
    if (filterParam === 'lead') return 'lead';
    if (filterParam === 'member') return 'member';
    if (filterParam === 'mine') return 'member'; // 兼容旧参数
    return 'all';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProjects();
  }, [activeTab]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: 1,
        pageSize: 50,
      };
      
      // 根据标签筛选
      if (activeTab === 'lead') {
        // 我领导的
        params.leadOnly = true;
      } else if (activeTab === 'member') {
        // 我的项目（作为成员或负责人）
        params.myProjects = true;
      } else if (activeTab === 'active') {
        params.businessStatus = 'ONGOING';
      } else if (activeTab === 'completed') {
        params.businessStatus = 'COMPLETED';
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await getProjects(params);
      setProjects(response.data || []);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadProjects();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 客户端过滤（作为后备）
  const filteredProjects = projects.filter((project) => {
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout
      header={{
        title: '项目',
        showBack: true,
        rightAction: (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={18} />}
              onClick={() => navigate('/projects/create')}
            />
          </div>
        ),
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 搜索栏 */}
        <motion.section variants={itemVariants}>
          <Input
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.section>

        {/* 标签页 */}
        <motion.section variants={itemVariants}>
          <Tabs value={activeTab} onChange={setActiveTab} variant="default">
            <TabList>
              <Tab value="all">全部</Tab>
              <Tab value="member">我的项目</Tab>
              <Tab value="lead">我领导的</Tab>
              <Tab value="active">进行中</Tab>
              <Tab value="completed">已完成</Tab>
            </TabList>
          </Tabs>
        </motion.section>

        {/* 项目列表 */}
        <motion.section variants={itemVariants} className="space-y-md">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <motion.div key={project.id} variants={itemVariants}>
                <Card
                  interactive
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="p-lg"
                >
                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-xs flex-wrap">
                        <Badge 
                          variant={businessStatusMap[project.businessStatus]?.variant || 'default'} 
                          size="sm"
                        >
                          {BUSINESS_STATUS_LABELS[project.businessStatus] || project.businessStatus}
                        </Badge>
                        {project.reviewStatus !== 'APPROVED' && (
                          <Badge variant="warning" size="sm">
                            {REVIEW_STATUS_LABELS[project.reviewStatus] || project.reviewStatus}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-serif-cn text-subtitle text-deep-black mb-xs">
                        {project.name}
                      </h3>
                      <p className="text-caption text-stone-gray line-clamp-1">
                        {BUSINESS_TYPE_LABELS[project.businessType] || project.businessType}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-stone-gray flex-shrink-0 ml-md" />
                  </div>

                  {/* 分隔线 */}
                  <div className="w-8 h-px bg-champagne-gold mb-md" />

                  {/* 信息标签 */}
                  <div className="flex flex-wrap gap-md mb-md text-tiny text-stone-gray">
                    {project.industry && (
                      <span className="flex items-center gap-xs">
                        <TrendingUp size={12} /> {project.industry}
                      </span>
                    )}
                    {project.region && (
                      <span className="flex items-center gap-xs">
                        <MapPin size={12} /> {project.region}
                      </span>
                    )}
                    <span className="flex items-center gap-xs">
                      <Calendar size={12} /> {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-tiny text-stone-gray">
                    <span>发起人: {project.createdBy.name}</span>
                    <span>{project.membersCount}人参与</span>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Empty
              type="data"
              title="暂无项目"
              description="没有找到符合条件的项目"
            />
          )}
        </motion.section>
      </motion.div>
    </AppLayout>
  );
}

export { ProjectsPage };
