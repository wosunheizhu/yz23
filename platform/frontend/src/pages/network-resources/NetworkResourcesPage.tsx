/**
 * 人脉资源列表页面
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Users,
  Building,
  Filter,
  ChevronRight,
  Star,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Tabs, TabList, Tab } from '../../components/ui';
import {
  getNetworkResources,
  NetworkResource,
  RESOURCE_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
  CONTACT_STATUS_LABELS,
  ListNetworkResourcesParams,
} from '../../api/network-resources';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 联系状态颜色映射
const contactStatusColors: Record<string, string> = {
  PENDING: 'bg-gallery-gray text-stone-gray',
  CONTACTED: 'bg-info/10 text-info',
  SUCCEEDED: 'bg-success/10 text-success',
  FAILED: 'bg-error/10 text-error',
};

export default function NetworkResourcesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<NetworkResource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'mine' | 'all' | 'person' | 'org'>('mine');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    loadResources();
  }, [activeTab]);

  const loadResources = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setPage(1);
      }

      const params: ListNetworkResourcesParams = {
        page: isLoadMore ? page + 1 : 1,
        pageSize: 20,
        search: searchQuery || undefined,
        resourceType: activeTab === 'person' ? 'PERSON' : activeTab === 'org' ? 'ORG' : undefined,
        createdByMe: activeTab === 'mine' ? true : undefined, // 默认只显示我创建的
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await getNetworkResources(params);
      
      if (isLoadMore) {
        setResources([...resources, ...(result.items || [])]);
        setPage(page + 1);
      } else {
        setResources(result.items || []);
      }
      
      setTotal(result.total);
      setHasMore((isLoadMore ? page + 1 : 1) < result.totalPages);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadResources();
  };

  const tabs = [
    { id: 'mine', label: '我的' },
    { id: 'all', label: '全部可见' },
    { id: 'person', label: '个人' },
    { id: 'org', label: '机构' },
  ];

  if (loading && resources.length === 0) {
    return (
      <AppLayout
        header={{ title: '人脉资源', showBack: true }}
      >
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      header={{ title: '人脉资源', showBack: true }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 搜索栏 */}
        <motion.div variants={itemVariants} className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索姓名、机构、行业..."
            className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-12 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-gray hover:text-champagne-gold"
          >
            <Filter size={18} />
          </button>
        </motion.div>

        {/* 分类标签 */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onChange={(id) => setActiveTab(id as 'mine' | 'all' | 'person' | 'org')}>
            <TabList>
              {tabs.map(tab => (
                <Tab key={tab.id} value={tab.id}>{tab.label}</Tab>
              ))}
            </TabList>
          </Tabs>
        </motion.div>

        {/* 统计信息 */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <span className="text-sm text-stone-gray">共 {total} 条资源</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/network-resources/create')}
          >
            <Plus size={16} className="mr-1" />
            新增
          </Button>
        </motion.div>

        {/* 资源列表 */}
        {resources.length === 0 ? (
          <Empty
            description="暂无人脉资源"
            action={
              <Button variant="primary" onClick={() => navigate('/network-resources/create')}>
                添加第一条资源
              </Button>
            }
          />
        ) : (
          <div className="space-y-sm">
            {resources.map((resource) => (
              <motion.div key={resource.id} variants={itemVariants}>
                <Card
                  interactive
                  onClick={() => navigate(`/network-resources/${resource.id}`)}
                  className="p-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-md flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gallery-gray flex items-center justify-center flex-shrink-0">
                        {resource.resourceType === 'PERSON' ? (
                          <Users size={18} className="text-stone-gray" />
                        ) : (
                          <Building size={18} className="text-stone-gray" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-sm mb-xs">
                          <h4 className="text-body text-deep-black font-medium truncate">
                            {resource.name || resource.organization || '未命名'}
                          </h4>
                          <Badge
                            variant="default"
                            size="sm"
                            className={contactStatusColors[resource.contactStatus]}
                          >
                            {CONTACT_STATUS_LABELS[resource.contactStatus]}
                          </Badge>
                        </div>
                        <p className="text-tiny text-stone-gray truncate mb-xs">
                          {resource.organization && resource.title
                            ? `${resource.organization} · ${resource.title}`
                            : resource.organization || resource.title || '-'}
                        </p>
                        <div className="flex items-center gap-md">
                          {/* 关系强度 */}
                          <div className="flex items-center gap-xs">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <Star
                                key={level}
                                size={12}
                                className={level <= resource.relationshipStrength ? 'text-champagne-gold fill-champagne-gold' : 'text-silk-gray'}
                              />
                            ))}
                          </div>
                          {/* 行业标签 */}
                          {resource.industryTags.length > 0 && (
                            <span className="text-tiny text-champagne-gold">
                              {resource.industryTags[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-stone-gray flex-shrink-0 mt-3" />
                  </div>
                </Card>
              </motion.div>
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => loadResources(true)}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

