/**
 * 需求详情页面
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Briefcase,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Avatar } from '../../components/ui';
import { getDemand, Demand, DEMAND_STATUS_LABELS } from '../../api/demands';
import { getResponses, ResponseListItem, RESPONSE_STATUS_LABELS } from '../../api/responses';

// 状态颜色映射
const statusColors: Record<string, string> = {
  DRAFT: 'bg-gallery-gray text-stone-gray',
  OPEN: 'bg-success/10 text-success',
  IN_PROGRESS: 'bg-info/10 text-info',
  CLOSED: 'bg-gallery-gray text-stone-gray',
  CANCELLED: 'bg-error/10 text-error',
};

const responseStatusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  ACCEPTED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
  WITHDRAWN: 'bg-gallery-gray text-stone-gray',
  COMPLETED: 'bg-info/10 text-info',
};

export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [demand, setDemand] = useState<Demand | null>(null);
  const [responses, setResponses] = useState<ResponseListItem[]>([]);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (demandId: string) => {
    try {
      setLoading(true);
      const [demandData, responsesData] = await Promise.all([
        getDemand(demandId),
        getResponses({ demandId, page: 1, pageSize: 20 }).catch(() => ({ data: [] })),
      ]);
      setDemand(demandData);
      // getResponses 返回 { success, data, pagination }，data 是响应数组
      setResponses(responsesData.data || []);
    } catch (err) {
      console.error('Failed to load demand:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SimpleLayout title="需求详情">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!demand) {
    return (
      <SimpleLayout title="需求详情">
        <Empty description="需求不存在" />
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="需求详情">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 基本信息 */}
        <Card className="p-xl">
          <div className="flex items-start justify-between mb-md">
            <Badge size="sm" className={statusColors[demand.status]}>
              {DEMAND_STATUS_LABELS[demand.status]}
            </Badge>
            {demand.urgency === 'HIGH' && (
              <Badge size="sm" variant="new">紧急</Badge>
            )}
          </div>

          <h2 className="font-serif-cn text-title text-deep-black mb-md">
            {demand.name}
          </h2>

          <p className="text-body text-charcoal mb-lg whitespace-pre-wrap">
            {demand.description}
          </p>

          <div className="space-y-sm text-sm text-stone-gray">
            {demand.projectName && (
              <div className="flex items-center gap-md">
                <Briefcase size={16} />
                <span
                  className="text-champagne-gold cursor-pointer hover:underline"
                  onClick={() => navigate(`/projects/${demand.projectId}`)}
                >
                  {demand.projectName}
                </span>
              </div>
            )}
            {demand.deadline && (
              <div className="flex items-center gap-md">
                <Clock size={16} />
                <span>截止日期: {formatDate(demand.deadline)}</span>
              </div>
            )}
            <div className="flex items-center gap-md">
              <Calendar size={16} />
              <span>发布于 {formatDate(demand.createdAt)}</span>
            </div>
          </div>
        </Card>

        {/* 发布者信息 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md">发布者</h3>
          <div className="flex items-center gap-md">
            <Avatar name={demand.primaryOwner?.name || ''} size="md" />
            <div>
              <p className="text-body text-deep-black">{demand.primaryOwner?.name || '未知'}</p>
              <p className="text-tiny text-stone-gray">需求发起人</p>
            </div>
          </div>
        </Card>

        {/* 响应列表 */}
        <Card className="p-lg">
          <div className="flex items-center justify-between mb-md">
            <h3 className="section-title">响应列表 ({responses.length})</h3>
          </div>

          {responses.length === 0 ? (
            <p className="text-center text-stone-gray text-sm py-lg">暂无响应</p>
          ) : (
            <div className="space-y-sm">
              {responses.map((response) => (
                <button
                  key={response.id}
                  onClick={() => navigate(`/responses/${response.id}`)}
                  className="w-full flex items-center justify-between p-md bg-gallery-gray rounded-gallery hover:bg-silk-gray transition-colors text-left"
                >
                  <div className="flex items-center gap-md">
                    <Avatar name={response.responder?.name || ''} src={response.responder?.avatar || undefined} size="sm" />
                    <div>
                      <p className="text-body text-deep-black">{response.responder?.name}</p>
                      <p className="text-tiny text-stone-gray line-clamp-1">
                        {response.intendedRewardSummary || '查看详情'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Badge size="sm" className={responseStatusColors[response.status] || 'bg-gallery-gray text-stone-gray'}>
                      {RESPONSE_STATUS_LABELS[response.status] || response.status}
                    </Badge>
                    <ChevronRight size={16} className="text-stone-gray" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* 操作按钮 */}
        {demand.status === 'OPEN' && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate(`/demands/${id}/respond`)}
          >
            <MessageSquare size={16} className="mr-2" />
            提交响应
          </Button>
        )}
      </motion.div>
    </SimpleLayout>
  );
}

