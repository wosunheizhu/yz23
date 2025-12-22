/**
 * 管理员 - Token 发放任务审核页面
 * 支持座谈会嘉宾邀请和线下到访两种来源的Token奖励审核
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  UserCheck,
  Gift,
  Calendar,
  Building2,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import {
  Card,
  Badge,
  Button,
  Loading,
  Empty,
  Avatar,
  Tabs,
  TabList,
  Tab,
  Modal,
  Input,
} from '../../components/ui';
import * as tokenGrantTasksApi from '../../api/token-grant-tasks';
import {
  GrantTaskResponse,
  TokenGrantTaskStatus,
  TaskSource,
  TASK_SOURCE_LABELS,
} from '../../api/token-grant-tasks';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const STATUS_LABELS: Record<TokenGrantTaskStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

const STATUS_COLORS: Record<TokenGrantTaskStatus, string> = {
  PENDING: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
};

const GUEST_CATEGORY_LABELS: Record<string, string> = {
  PUBLIC_CO_DMHG: '上市公司董监高',
  FIN_EXEC: '金融从业高管',
  PUBLIC_CHAIRMAN_CONTROLLER: '上市公司董事长/实控人',
  MINISTRY_LEADER: '部委部级领导',
  BUREAU_LEADER: '厅级领导',
  DEPT_LEADER: '处级领导',
  OTHER: '其他',
};

export default function AdminTokenGrantTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'all' | 'MEETING_GUEST' | 'ONSITE_VISIT'>(
    (searchParams.get('source') as TaskSource) || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<TokenGrantTaskStatus | 'all'>(
    (searchParams.get('status') as TokenGrantTaskStatus) || 'PENDING'
  );
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<GrantTaskResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // 审核弹窗状态
  const [selectedTask, setSelectedTask] = useState<GrantTaskResponse | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [amountOverride, setAmountOverride] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [activeTab, statusFilter, pagination.page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const query: tokenGrantTasksApi.ListGrantTasksQuery = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }
      if (activeTab !== 'all') {
        query.taskSource = activeTab;
      }
      const response = await tokenGrantTasksApi.listGrantTasks(query);
      setTasks(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      console.error('加载发放任务失败:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'all' | 'MEETING_GUEST' | 'ONSITE_VISIT');
    setSearchParams((prev) => {
      prev.set('source', tab);
      return prev;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status as TokenGrantTaskStatus | 'all');
    setSearchParams((prev) => {
      prev.set('status', status);
      return prev;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const openApproveModal = (task: GrantTaskResponse) => {
    setSelectedTask(task);
    setAmountOverride(String(task.defaultAmount));
    setComment('');
    setApproveModalOpen(true);
  };

  const openRejectModal = (task: GrantTaskResponse) => {
    setSelectedTask(task);
    setComment('');
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      const override = parseFloat(amountOverride);
      await tokenGrantTasksApi.approveTask(selectedTask.id, {
        amountOverride: isNaN(override) ? undefined : override,
        comment: comment || undefined,
      });
      setApproveModalOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      await tokenGrantTasksApi.rejectTask(selectedTask.id, {
        comment: comment || undefined,
      });
      setRejectModalOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err) {
      console.error('拒绝失败:', err);
      alert('拒绝失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getGuestInfo = (task: GrantTaskResponse) => {
    if (task.taskSource === 'MEETING_GUEST' && task.guest) {
      return {
        name: task.guest.name,
        organization: task.guest.organization,
        title: task.guest.title,
        category: task.guest.guestCategory,
        date: task.meeting ? new Date(task.meeting.startTime) : null,
        context: task.meeting?.topic || '',
      };
    } else if (task.taskSource === 'ONSITE_VISIT' && task.onsiteVisit) {
      return {
        name: task.onsiteVisit.name,
        organization: task.onsiteVisit.organization,
        title: task.onsiteVisit.title,
        category: task.onsiteVisit.guestCategory,
        date: new Date(task.onsiteVisit.visitDate),
        context: '线下到访',
      };
    }
    return null;
  };

  const renderTaskCard = (task: GrantTaskResponse) => {
    const guestInfo = getGuestInfo(task);
    if (!guestInfo) return null;

    const isMeetingGuest = task.taskSource === 'MEETING_GUEST';

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-lg">
          {/* 头部：来源标签 + 状态 */}
          <div className="flex items-start justify-between mb-md">
            <div className="flex items-center gap-md">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isMeetingGuest ? 'bg-info/10' : 'bg-success/10'
                }`}
              >
                {isMeetingGuest ? (
                  <Users size={20} className="text-info" />
                ) : (
                  <UserCheck size={20} className="text-success" />
                )}
              </div>
              <div>
                <p className="font-medium text-deep-black">
                  {TASK_SOURCE_LABELS[task.taskSource]}
                </p>
                <p className="text-sm text-stone-gray">
                  {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </p>
              </div>
            </div>
            <Badge size="sm" className={STATUS_COLORS[task.status]}>
              {STATUS_LABELS[task.status]}
            </Badge>
          </div>

          {/* 嘉宾信息 */}
          <div className="bg-gallery-gray rounded-lg p-md mb-md">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={guestInfo.name} size="md" />
              <div>
                <p className="font-medium text-deep-black">{guestInfo.name}</p>
                <div className="flex items-center gap-2 text-sm text-stone-gray">
                  <Building2 size={14} />
                  <span>{guestInfo.organization}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-gray">
                  <Briefcase size={14} />
                  <span>{guestInfo.title}</span>
                </div>
              </div>
            </div>

            {/* 嘉宾分类 */}
            <div className="flex items-center gap-2 mb-2">
              <Badge size="xs" className="bg-champagne-gold/10 text-champagne-gold">
                {GUEST_CATEGORY_LABELS[guestInfo.category] || guestInfo.category}
              </Badge>
            </div>

            {/* 来源上下文 */}
            <div className="flex items-center gap-2 text-sm text-stone-gray">
              <Calendar size={14} />
              <span>
                {guestInfo.date
                  ? format(guestInfo.date, 'yyyy-MM-dd', { locale: zhCN })
                  : '-'}
              </span>
              {guestInfo.context && <span>· {guestInfo.context}</span>}
            </div>
          </div>

          {/* 历史记录警告 */}
          {task.historyWarnings && task.historyWarnings.length > 0 && (
            <div className="mb-md space-y-2">
              {task.historyWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    warning.type === 'SAME_PERSON'
                      ? 'bg-error/10 text-error'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  <AlertTriangle size={16} />
                  <span className="text-sm font-medium">{warning.message}</span>
                  {warning.lastVisitDate && (
                    <span className="text-xs opacity-75">
                      (上次: {format(new Date(warning.lastVisitDate), 'yyyy-MM-dd')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 邀请人信息 */}
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-gray">邀请人:</span>
              <Avatar
                name={task.inviter.name}
                src={task.inviter.avatar || undefined}
                size="xs"
              />
              <span className="text-sm text-deep-black">{task.inviter.name}</span>
            </div>
          </div>

          {/* Token 金额 */}
          <div className="flex items-center justify-between mb-md px-3 py-2 bg-champagne-gold/5 rounded-lg">
            <span className="text-sm text-stone-gray">建议发放金额</span>
            <div>
              <span className="text-xl font-semibold text-champagne-gold">
                {task.defaultAmount.toLocaleString()}
              </span>
              <span className="text-sm text-stone-gray ml-1">Token</span>
            </div>
          </div>

          {/* 审核结果（已处理的任务） */}
          {task.status !== 'PENDING' && (
            <div className="border-t border-gallery-gray pt-md mt-md">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-gray">审核人:</span>
                <span className="text-deep-black">{task.admin?.name || '-'}</span>
              </div>
              {task.finalAmount !== null && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-stone-gray">实际发放:</span>
                  <span className="font-medium text-champagne-gold">
                    {task.finalAmount.toLocaleString()} Token
                  </span>
                </div>
              )}
              {task.adminComment && (
                <div className="mt-2 text-sm text-stone-gray">
                  备注: {task.adminComment}
                </div>
              )}
              {task.decidedAt && (
                <div className="mt-1 text-xs text-stone-gray">
                  处理时间: {format(new Date(task.decidedAt), 'yyyy-MM-dd HH:mm')}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮（待审核） */}
          {task.status === 'PENDING' && (
            <div className="flex items-center justify-end gap-2 mt-md">
              <Button variant="outline" size="sm" onClick={() => openRejectModal(task)}>
                <XCircle size={16} className="mr-1" />
                拒绝
              </Button>
              <Button variant="primary" size="sm" onClick={() => openApproveModal(task)}>
                <CheckCircle size={16} className="mr-1" />
                通过
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  return (
    <SimpleLayout title="Token 发放任务" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 来源筛选 */}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <TabList>
            <Tab value="all">全部</Tab>
            <Tab value="MEETING_GUEST">
              <Users size={16} className="mr-1" />
              座谈会嘉宾
            </Tab>
            <Tab value="ONSITE_VISIT">
              <UserCheck size={16} className="mr-1" />
              线下到访
            </Tab>
          </TabList>
        </Tabs>

        {/* 状态筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleStatusChange(status)}
            >
              {status === 'all' ? '全部' : STATUS_LABELS[status]}
            </Button>
          ))}
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : tasks.length === 0 ? (
          <Empty description="暂无发放任务" />
        ) : (
          <div className="space-y-md">
            {tasks.map(renderTaskCard)}
          </div>
        )}

        {/* 分页 */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-md">
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              上一页
            </Button>
            <span className="text-sm text-stone-gray">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 通过审核弹窗 */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="审核通过"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-gray mb-1.5">发放金额</label>
            <Input
              type="number"
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder="输入发放金额（可修改默认值）"
            />
            <p className="text-xs text-stone-gray mt-1">
              默认金额: {selectedTask?.defaultAmount.toLocaleString()} Token
            </p>
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1.5">审核备注（可选）</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="输入审核备注"
              rows={3}
              className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setApproveModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleApprove} loading={submitting}>
              确认通过
            </Button>
          </div>
        </div>
      </Modal>

      {/* 拒绝审核弹窗 */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="拒绝发放"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-stone-gray mb-1.5">拒绝原因</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请输入拒绝原因"
              rows={3}
              className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              className="bg-error hover:bg-error/90"
              onClick={handleReject}
              loading={submitting}
            >
              确认拒绝
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}

