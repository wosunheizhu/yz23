/**
 * 需求广场页
 * 元征 · 合伙人赋能平台
 * 
 * 高端简约现代艺术画廊风格 - 白色主题
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, ChevronRight, Users, Briefcase, Filter } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Empty, Loading } from '../../components/ui';
import { 
  getDemands, 
  DEMAND_TYPE_LABELS,
  DEMAND_STATUS_LABELS,
  type DemandListItem,
} from '../../api/demands';
import { BUSINESS_TYPE_LABELS } from '../../api/projects';

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// 状态颜色映射
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-success/10', text: 'text-success' },
  IN_PROGRESS: { bg: 'bg-info/10', text: 'text-info' },
  PARTIALLY_FULFILLED: { bg: 'bg-warning/10', text: 'text-warning' },
  FULFILLED: { bg: 'bg-champagne-gold/10', text: 'text-champagne-gold' },
  CLOSED: { bg: 'bg-stone-gray/10', text: 'text-stone-gray' },
};

export const DemandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [demandType, setDemandType] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['demands', { search, demandType, status, page, pageSize }],
    queryFn: () => getDemands({
      search: search || undefined,
      demandType: demandType || undefined,
      status: status || undefined,
      page,
      pageSize,
      sort: '-createdAt',
    }),
  });

  const demands = data?.data || [];
  const pagination = data?.pagination;

  // 筛选标签
  const filters = [
    { id: '', label: '全部' },
    { id: 'NETWORK', label: '人脉需求' },
    { id: 'GENERAL', label: '普通需求' },
  ];

  return (
    <SimpleLayout
      title="需求广场"
      rightAction={
        <button
          onClick={() => navigate('/demands/create')}
          className="w-8 h-8 flex items-center justify-center text-deep-black"
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      }
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen bg-pure-white"
      >
        {/* 搜索栏 */}
        <motion.div variants={itemVariants} className="px-lg py-md sticky top-0 bg-pure-white z-10 border-b border-gallery-gray">
          <div className="flex items-center gap-sm">
            <div className="flex-1 relative">
              <Search 
                size={16} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="搜索需求..."
                className="w-full pl-9 pr-4 py-2.5 bg-gallery-gray/50 rounded-gallery text-sm text-deep-black placeholder:text-stone-gray focus:outline-none focus:ring-1 focus:ring-champagne-gold/30 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-gallery transition-colors ${
                showFilters || status ? 'bg-champagne-gold/10 text-champagne-gold' : 'bg-gallery-gray/50 text-stone-gray'
              }`}
            >
              <Filter size={18} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>

        {/* 类型筛选 */}
        <motion.div variants={itemVariants} className="px-lg py-sm">
          <div className="flex gap-sm overflow-x-auto hide-scrollbar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => { setDemandType(filter.id); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  demandType === filter.id
                    ? 'bg-deep-black text-pure-white'
                    : 'bg-gallery-gray/50 text-stone-gray hover:bg-gallery-gray'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 状态筛选（展开时显示） */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-lg pb-sm"
          >
            <p className="text-xs text-stone-gray mb-2">需求状态</p>
            <div className="flex gap-sm flex-wrap">
              {[
                { id: '', label: '全部' },
                { id: 'OPEN', label: '开放中' },
                { id: 'IN_PROGRESS', label: '进行中' },
                { id: 'FULFILLED', label: '已完成' },
                { id: 'CLOSED', label: '已关闭' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setStatus(s.id); setPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    status === s.id
                      ? 'bg-champagne-gold/20 text-champagne-gold border border-champagne-gold/30'
                      : 'bg-gallery-gray/50 text-stone-gray hover:bg-gallery-gray'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 需求列表 */}
        <div className="px-lg py-md space-y-sm">
          {isLoading ? (
            <div className="py-16">
              <Loading size="lg" />
            </div>
          ) : error ? (
            <div className="py-16">
              <Empty 
                description="加载失败，请稍后重试" 
                action={
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 text-sm text-champagne-gold hover:underline"
                  >
                    刷新重试
                  </button>
                }
              />
            </div>
          ) : demands.length === 0 ? (
            <motion.div variants={itemVariants} className="py-16">
              <Empty 
                description={search || demandType || status ? "没有找到匹配的需求" : "暂无需求"} 
                action={
                  <button 
                    onClick={() => navigate('/demands/create')}
                    className="mt-4 px-4 py-2 bg-deep-black text-pure-white rounded-gallery text-sm hover:bg-charcoal transition-colors"
                  >
                    发布需求
                  </button>
                }
              />
            </motion.div>
          ) : (
            <>
              {demands.map((demand) => (
                <motion.div key={demand.id} variants={itemVariants}>
                  <DemandCard demand={demand} />
                </motion.div>
              ))}

              {/* 分页 */}
              {pagination && pagination.totalPages > 1 && (
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-lg">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm text-stone-gray hover:text-deep-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-stone-gray">
                    <span className="text-deep-black font-medium">{page}</span>
                    <span className="mx-1">/</span>
                    <span>{pagination.totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 text-sm text-stone-gray hover:text-deep-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* 底部安全区域 */}
        <div className="h-safe-bottom" />
      </motion.div>
    </SimpleLayout>
  );
};

// 需求卡片
const DemandCard: React.FC<{ demand: DemandListItem }> = ({ demand }) => {
  const statusStyle = STATUS_STYLES[demand.status] || STATUS_STYLES.CLOSED;

  return (
    <Link
      to={`/demands/${demand.id}`}
      className="block"
    >
      <Card interactive className="p-lg">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-md mb-sm">
          <h3 className="font-serif-cn text-base text-deep-black line-clamp-2 flex-1">
            {demand.name}
          </h3>
          <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
            {DEMAND_STATUS_LABELS[demand.status]}
          </span>
        </div>

        {/* 类型和业务标签 */}
        <div className="flex items-center gap-sm mb-md">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
            demand.demandType === 'NETWORK' 
              ? 'bg-purple-50 text-purple-600' 
              : 'bg-gallery-gray text-stone-gray'
          }`}>
            {demand.demandType === 'NETWORK' && <Users size={12} />}
            {DEMAND_TYPE_LABELS[demand.demandType]}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gallery-gray text-stone-gray">
            <Briefcase size={12} />
            {BUSINESS_TYPE_LABELS[demand.businessType]}
          </span>
        </div>

        {/* 项目信息 */}
        <div className="text-xs text-stone-gray mb-sm">
          <span className="text-stone-gray/60">所属项目：</span>
          <span className="text-deep-black">{demand.projectName}</span>
        </div>

        {/* 分隔线 */}
        <div className="w-full h-px bg-gallery-gray my-sm" />

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-stone-gray">
            <span className="text-stone-gray/60">激励：</span>
            <span className="text-champagne-gold">{demand.rewardSummary}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-stone-gray">
            <span>{demand.responsesCount || 0}</span>
            <span>响应</span>
            <ChevronRight size={14} className="text-stone-gray/50" />
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default DemandsPage;
