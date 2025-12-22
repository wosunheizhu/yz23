/**
 * 管理员 - 项目管理页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle, XCircle, Clock, Eye, Filter } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Avatar } from '../../components/ui';
import { projectsApi, ProjectListItem } from '../../api/projects';

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
};

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');

  useEffect(() => {
    loadProjects();
  }, [filter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params: any = { pageSize: 50 };
      if (filter === 'pending') {
        params.reviewStatus = 'PENDING_REVIEW';
      } else if (filter !== 'all') {
        params.reviewStatus = filter;
      }
      const response = await projectsApi.list(params);
      setProjects(response.data || []);
    } catch (err) {
      console.error('加载项目失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setSearchParams(newFilter === 'all' ? {} : { status: newFilter });
  };

  const handleApprove = async (projectId: string) => {
    try {
      await projectsApi.review(projectId, 'approve');
      loadProjects();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败');
    }
  };

  const handleReject = async (projectId: string) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    try {
      await projectsApi.review(projectId, 'reject', reason);
      loadProjects();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败');
    }
  };

  return (
    <SimpleLayout title="项目管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 筛选器 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'pending', label: '待审核' },
            { value: 'APPROVED', label: '已通过' },
            { value: 'REJECTED', label: '已拒绝' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleFilterChange(item.value)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === item.value
                  ? 'bg-champagne-gold text-deep-black'
                  : 'bg-gallery-gray text-stone-gray'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <Empty description="暂无项目" />
        ) : (
          <div className="space-y-md">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge size="sm" className={REVIEW_STATUS_COLORS[project.reviewStatus] || 'bg-gallery-gray text-stone-gray'}>
                          {REVIEW_STATUS_LABELS[project.reviewStatus] || project.reviewStatus}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-deep-black mb-1">{project.name}</h4>
                      <p className="text-sm text-stone-gray line-clamp-2">{project.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-gray mb-md">
                    <span>行业: {project.industry}</span>
                    <span>•</span>
                    <span>地区: {project.region}</span>
                    <span>•</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-md border-t border-silk-gray">
                    <div className="flex items-center gap-2">
                      {project.leaders?.slice(0, 3).map((leader: any) => (
                        <Avatar key={leader.id} name={leader.name} src={leader.avatar} size="sm" />
                      ))}
                      {project.leaders && project.leaders.length > 3 && (
                        <span className="text-xs text-stone-gray">+{project.leaders.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <Eye size={16} className="mr-1" />
                        查看
                      </Button>
                      {project.reviewStatus === 'PENDING_REVIEW' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(project.id)}
                          >
                            <XCircle size={16} className="mr-1" />
                            拒绝
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(project.id)}
                          >
                            <CheckCircle size={16} className="mr-1" />
                            通过
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SimpleLayout>
  );
}

