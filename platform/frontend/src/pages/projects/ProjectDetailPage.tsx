/**
 * 项目详情页
 * 元征 · 合伙人赋能平台
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Edit3, Plus, Users, PieChart, Clock, FileText,
  UserPlus, Check, X, History, MoreVertical, ChevronRight
} from 'lucide-react';
import { 
  getProjectById, 
  getProjectEvents,
  reviewProject,
  updateProject,
  addProjectEvent,
  correctProjectEvent,
  adjustShares,
  addMember,
  requestJoinProject,
  getJoinRequests,
  reviewJoinRequest,
  removeMember,
  updateMemberRole,
  BUSINESS_TYPE_LABELS, 
  REVIEW_STATUS_LABELS, 
  BUSINESS_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
  BUSINESS_STATUS_COLORS,
  type ProjectEvent,
  type ProjectDetail,
  type JoinRequest,
  type CreateProjectEventDto,
  type AdjustSharesDto,
} from '../../api/projects';
import { getDemandsByProject, DEMAND_TYPE_LABELS, DEMAND_STATUS_COLORS } from '../../api/demands';
import { listUsers, UserListItem } from '../../api/users';
import { useAuthStore } from '../../stores/authStore';
import { Button, Modal, Loading, Empty, Avatar, Card } from '../../components/ui';

// Tab 类型
type TabType = 'overview' | 'timeline' | 'demands' | 'members' | 'shares';

// 事件类型标签
const EVENT_TYPE_LABELS: Record<string, string> = {
  PROJECT_CREATED: '项目创建',
  PROJECT_APPROVED: '项目通过',
  PROJECT_REJECTED: '项目驳回',
  PROJECT_STATUS_CHANGED: '状态变更',
  PROJECT_MEMBER_JOINED: '成员加入',
  PROJECT_MEMBER_LEFT: '成员离开',
  SHARE_STRUCTURE_CHANGED: '股权变更',
  DEMAND_PUBLISHED: '发布需求',
  DEMAND_UPDATED: '更新需求',
  DEMAND_CLOSED: '关闭需求',
  DEMAND_RESPONDED: '收到响应',
  DEMAND_ACCEPTED: '响应被接受',
  DEMAND_RESPONSE_REJECTED: '响应被拒绝',
  RESOURCE_USED: '资源已使用',
  TOKEN_TRANSFER_COMPLETED: 'Token转账完成',
  TOKEN_DIVIDEND_DISTRIBUTED: '分红发放',
  MEETING_HELD: '会议召开',
  NOTE: '备注',
  MILESTONE_ADDED: '里程碑',
  EVENT_CORRECTED: '事件更正',
};

// 事件类型图标颜色
const EVENT_TYPE_COLORS: Record<string, string> = {
  PROJECT_CREATED: 'bg-green-500',
  PROJECT_APPROVED: 'bg-green-500',
  PROJECT_REJECTED: 'bg-red-500',
  DEMAND_PUBLISHED: 'bg-blue-500',
  DEMAND_RESPONDED: 'bg-purple-500',
  DEMAND_ACCEPTED: 'bg-green-500',
  SHARE_STRUCTURE_CHANGED: 'bg-yellow-500',
  PROJECT_MEMBER_JOINED: 'bg-indigo-500',
  EVENT_CORRECTED: 'bg-orange-500',
  NOTE: 'bg-gray-500',
  MILESTONE_ADDED: 'bg-champagne-gold',
};

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditSharesModal, setShowEditSharesModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);

  // 获取项目详情
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectById(id!),
    enabled: !!id,
  });

  // 获取项目时间线
  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ['project-events', id],
    queryFn: () => getProjectEvents(id!),
    enabled: !!id && activeTab === 'timeline',
  });

  // 获取项目需求
  const { data: demands = [] } = useQuery({
    queryKey: ['project-demands', id],
    queryFn: () => getDemandsByProject(id!),
    enabled: !!id && activeTab === 'demands',
  });

  // 获取加入申请
  const { data: joinRequests = [], refetch: refetchJoinRequests } = useQuery({
    queryKey: ['project-join-requests', id],
    queryFn: () => getJoinRequests(id!),
    enabled: !!id && showJoinRequestsModal,
  });

  // 审核项目
  const reviewMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'approve' | 'reject'; reason?: string }) =>
      reviewProject(id!, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowReviewModal(false);
    },
  });

  // 更新项目
  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProjectDetail>) => updateProject(id!, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowEditModal(false);
    },
  });

  // 添加事件
  const addEventMutation = useMutation({
    mutationFn: (data: CreateProjectEventDto) => addProjectEvent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-events', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowAddEventModal(false);
    },
  });

  // 调整股权
  const adjustSharesMutation = useMutation({
    mutationFn: (data: AdjustSharesDto) => adjustShares(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-events', id] });
      setShowEditSharesModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pearl-white flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-pearl-white flex items-center justify-center">
        <Empty description="加载失败" />
      </div>
    );
  }

  const canReview = user?.isAdmin && project.reviewStatus === 'PENDING_REVIEW';
  const isLeader = project.leaders.some((l) => l.id === user?.id);
  const isMember = project.members.some((m) => m.id === user?.id);
  const canEdit = isLeader || user?.isAdmin;
  const canManageMembers = isLeader || user?.isAdmin;
  const canEditShares = isLeader || user?.isAdmin;

  return (
    <div className="min-h-screen bg-pearl-white">
      {/* 顶部返回栏 */}
      <div className="bg-pure-white border-b border-silk-gray px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-1 hover:bg-pearl-white rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-ink-black" />
            </button>
            <h1 className="text-lg font-semibold text-ink-black truncate max-w-[200px]">
              {project.name}
            </h1>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-pearl-white rounded-lg transition-colors"
            >
              <Edit3 size={18} className="text-stone-gray" />
            </button>
          )}
        </div>
      </div>

      {/* 项目头部 */}
      <div className="bg-pure-white px-4 py-4 border-b border-silk-gray">
        {/* 状态标签 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            BUSINESS_STATUS_COLORS[project.businessStatus]
          }`}>
            {BUSINESS_STATUS_LABELS[project.businessStatus]}
          </span>
          {project.reviewStatus !== 'APPROVED' && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              REVIEW_STATUS_COLORS[project.reviewStatus]
            }`}>
              {REVIEW_STATUS_LABELS[project.reviewStatus]}
            </span>
          )}
        </div>

        {/* 项目信息 */}
        <p className="text-sm text-stone-gray mb-3">
          {BUSINESS_TYPE_LABELS[project.businessType]}
          {project.industry && ` · ${project.industry}`}
          {project.region && ` · ${project.region}`}
        </p>

        {/* 描述 */}
        {project.description && (
          <p className="text-sm text-charcoal mb-3 line-clamp-3">
            {project.description}
          </p>
        )}

        {/* 负责人 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-stone-gray">负责人:</span>
          <div className="flex -space-x-2">
            {project.leaders.slice(0, 3).map((leader) => (
              <Avatar
                key={leader.id}
                name={leader.name}
                size="sm"
                className="ring-2 ring-pure-white"
              />
            ))}
            {project.leaders.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-pearl-white flex items-center justify-center text-xs text-stone-gray ring-2 ring-pure-white">
                +{project.leaders.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {canReview && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => setShowReviewModal(true)}
            >
              审核项目
            </Button>
          )}
          {canEdit && (
            <Link
              to={`/demands/create?projectId=${project.id}`}
              className="flex-1"
            >
              <Button variant="secondary" className="w-full">
                <Plus size={16} className="mr-1" />
                发布需求
              </Button>
            </Link>
          )}
          {!isMember && !isLeader && project.reviewStatus === 'APPROVED' && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {/* TODO: 申请加入 */}}
            >
              <UserPlus size={16} className="mr-1" />
              申请加入
            </Button>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="bg-pure-white border-b border-silk-gray px-4 sticky top-12 z-10">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
          {[
            { key: 'overview', label: '概览', icon: FileText },
            { key: 'timeline', label: '时间线', icon: Clock },
            { key: 'demands', label: `需求 (${project.demandsCount})`, icon: FileText },
            { key: 'members', label: `成员 (${project.members.length})`, icon: Users },
            { key: 'shares', label: '股权', icon: PieChart },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === tab.key
                  ? 'border-ink-black text-ink-black'
                  : 'border-transparent text-stone-gray hover:text-charcoal'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <OverviewTab project={project} />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab 
            events={events} 
            projectId={project.id}
            canEdit={canEdit}
            onAddEvent={() => setShowAddEventModal(true)}
            onRefresh={() => refetchEvents()}
          />
        )}
        {activeTab === 'demands' && (
          <DemandsTab demands={demands} projectId={project.id} canEdit={canEdit} />
        )}
        {activeTab === 'members' && (
          <MembersTab 
            members={project.members}
            leaders={project.leaders}
            canManage={canManageMembers}
            projectId={project.id}
            onAddMember={() => setShowAddMemberModal(true)}
            onViewRequests={() => setShowJoinRequestsModal(true)}
          />
        )}
        {activeTab === 'shares' && (
          <SharesTab 
            shares={project.shares} 
            canEdit={canEditShares}
            onEdit={() => setShowEditSharesModal(true)}
          />
        )}
      </div>

      {/* 审核弹窗 */}
      {showReviewModal && (
        <ReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={(action, reason) => reviewMutation.mutate({ action, reason })}
          isLoading={reviewMutation.isPending}
        />
      )}

      {/* 编辑项目弹窗 */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => updateMutation.mutate(data)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* 添加事件弹窗 */}
      {showAddEventModal && (
        <AddEventModal
          onClose={() => setShowAddEventModal(false)}
          onSubmit={(data) => addEventMutation.mutate(data)}
          isLoading={addEventMutation.isPending}
        />
      )}

      {/* 编辑股权弹窗 */}
      {showEditSharesModal && (
        <EditSharesModal
          currentShares={project.shares}
          onClose={() => setShowEditSharesModal(false)}
          onSubmit={(data) => adjustSharesMutation.mutate(data)}
          isLoading={adjustSharesMutation.isPending}
        />
      )}

      {/* 添加成员弹窗 */}
      {showAddMemberModal && (
        <AddMemberModal
          projectId={project.id}
          existingMemberIds={project.members.map(m => m.id)}
          onClose={() => setShowAddMemberModal(false)}
        />
      )}

      {/* 查看加入申请弹窗 */}
      {showJoinRequestsModal && (
        <JoinRequestsModal
          requests={joinRequests}
          onClose={() => setShowJoinRequestsModal(false)}
          onRefresh={() => refetchJoinRequests()}
        />
      )}
    </div>
  );
};

// 概览 Tab
const OverviewTab: React.FC<{ project: ProjectDetail }> = ({ project }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    {/* 关键信息卡片 */}
    <div className="grid grid-cols-2 gap-3">
      <Card className="p-4">
        <div className="text-2xl font-semibold text-ink-black">{project.demandsCount}</div>
        <div className="text-xs text-stone-gray">需求数</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold text-ink-black">{project.eventsCount}</div>
        <div className="text-xs text-stone-gray">时间线事件</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold text-ink-black">{project.members.length}</div>
        <div className="text-xs text-stone-gray">成员数</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-semibold text-ink-black">{project.leaders.length}</div>
        <div className="text-xs text-stone-gray">负责人数</div>
      </Card>
    </div>

    {/* 关联项目 */}
    {project.linkedProjects.length > 0 && (
      <Card className="p-4">
        <h3 className="text-sm font-medium text-ink-black mb-3">关联项目</h3>
        <div className="space-y-2">
          {project.linkedProjects.map((linked) => (
            <Link
              key={linked.id}
              to={`/projects/${linked.id}`}
              className="flex items-center justify-between p-2 hover:bg-pearl-white rounded-lg transition-colors"
            >
              <span className="text-sm text-charcoal">{linked.name}</span>
              <ChevronRight size={16} className="text-stone-gray" />
            </Link>
          ))}
        </div>
      </Card>
    )}
  </motion.div>
);

// 时间线 Tab
const TimelineTab: React.FC<{ 
  events: ProjectEvent[];
  projectId: string;
  canEdit: boolean;
  onAddEvent: () => void;
  onRefresh: () => void;
}> = ({ events, projectId, canEdit, onAddEvent, onRefresh }) => {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const queryClient = useQueryClient();

  const correctMutation = useMutation({
    mutationFn: ({ correctedEventId, correctionNote }: { correctedEventId: string; correctionNote: string }) =>
      correctProjectEvent(projectId, { correctedEventId, correctionNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-events', projectId] });
      setEditingEventId(null);
      setCorrectionNote('');
    },
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* 添加事件按钮 */}
      {canEdit && (
        <Button variant="secondary" className="w-full mb-4" onClick={onAddEvent}>
          <Plus size={16} className="mr-2" />
          添加进程记录
        </Button>
      )}

      {events.length === 0 ? (
        <Empty description="暂无事件" />
      ) : (
        <div className="relative">
          {/* 时间线轴 */}
          <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-silk-gray" />
          
          {events.map((event, index) => (
            <div key={event.id} className="relative pl-8 pb-4">
              {/* 时间点 */}
              <div className={`absolute left-0 w-4 h-4 rounded-full ${
                EVENT_TYPE_COLORS[event.eventType] || 'bg-gray-400'
              } ring-4 ring-pure-white`} />
              
              <Card className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-pearl-white text-stone-gray rounded">
                      {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                    </span>
                    <span className="text-xs text-stone-gray">
                      {new Date(event.createdAt).toLocaleString('zh-CN')}
                    </span>
                    {event.createdByName && (
                      <span className="text-xs text-stone-gray flex items-center gap-1">
                        · 由 <span className="text-charcoal">{event.createdByName}</span> 记录
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setEditingEventId(editingEventId === event.id ? null : event.id)}
                      className="p-1 hover:bg-pearl-white rounded"
                    >
                      <Edit3 size={14} className="text-stone-gray" />
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-ink-black font-medium">{event.title}</p>
                {event.description && (
                  <p className="text-xs text-stone-gray mt-1">{event.description}</p>
                )}

                {/* 更正表单 */}
                {editingEventId === event.id && (
                  <div className="mt-3 pt-3 border-t border-silk-gray">
                    <p className="text-xs text-stone-gray mb-2">添加更正说明（所有人可见编辑历史）</p>
                    <textarea
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      placeholder="请说明更正内容..."
                      className="w-full px-3 py-2 text-sm border border-silk-gray rounded-lg focus:outline-none focus:border-champagne-gold"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingEventId(null);
                          setCorrectionNote('');
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => correctMutation.mutate({
                          correctedEventId: event.id,
                          correctionNote,
                        })}
                        disabled={!correctionNote.trim() || correctMutation.isPending}
                      >
                        提交更正
                      </Button>
                    </div>
                  </div>
                )}

                {/* 显示更正历史（如果有） */}
                {event.payload?.corrections && (
                  <div className="mt-2 pt-2 border-t border-silk-gray">
                    <button className="flex items-center gap-1 text-xs text-stone-gray hover:text-charcoal">
                      <History size={12} />
                      查看编辑历史
                    </button>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// 需求 Tab
const DemandsTab: React.FC<{ demands: any[]; projectId: string; canEdit: boolean }> = ({ 
  demands, 
  projectId,
  canEdit 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-3"
  >
    {canEdit && (
      <Link to={`/demands/create?projectId=${projectId}`}>
        <Button variant="secondary" className="w-full mb-4">
          <Plus size={16} className="mr-2" />
          发布新需求
        </Button>
      </Link>
    )}

    {demands.length === 0 ? (
      <Empty 
        description="暂无需求"
        action={canEdit ? (
          <Link to={`/demands/create?projectId=${projectId}`} className="text-champagne-gold text-sm">
            发布第一个需求
          </Link>
        ) : undefined}
      />
    ) : (
      demands.map((demand) => (
        <Link
          key={demand.id}
          to={`/demands/${demand.id}`}
        >
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-ink-black line-clamp-1">{demand.name}</h4>
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                DEMAND_STATUS_COLORS[demand.status]
              }`}>
                {demand.status === 'OPEN' ? '开放中' : '已关闭'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-gray">
              <span className={`px-1.5 py-0.5 rounded ${
                demand.demandType === 'NETWORK' ? 'bg-purple-100 text-purple-700' : 'bg-pearl-white'
              }`}>
                {DEMAND_TYPE_LABELS[demand.demandType]}
              </span>
              <span>·</span>
              <span>{demand.responsesCount} 个响应</span>
              {demand.rewardSummary && (
                <>
                  <span>·</span>
                  <span>{demand.rewardSummary}</span>
                </>
              )}
            </div>
          </Card>
        </Link>
      ))
    )}
  </motion.div>
);

// 成员 Tab
const MembersTab: React.FC<{ 
  members: any[];
  leaders: any[];
  canManage: boolean;
  projectId: string;
  onAddMember: () => void;
  onViewRequests: () => void;
}> = ({ members, leaders, canManage, projectId, onAddMember, onViewRequests }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-3"
  >
    {canManage && (
      <div className="flex gap-2 mb-4">
        <Button variant="secondary" className="flex-1" onClick={onAddMember}>
          <UserPlus size={16} className="mr-2" />
          邀请成员
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onViewRequests}>
          <Users size={16} className="mr-2" />
          加入申请
        </Button>
      </div>
    )}

    {/* 负责人列表 */}
    {leaders.length > 0 && (
      <div className="mb-4">
        <h3 className="text-xs text-stone-gray mb-2 uppercase tracking-wider">负责人</h3>
        {leaders.map((leader) => (
          <Link
            key={leader.id}
            to={`/partners/${leader.id}`}
          >
            <Card className="p-3 mb-2 flex items-center gap-3">
              <Avatar name={leader.name} size="md" />
              <div className="flex-1">
                <div className="font-medium text-ink-black">{leader.name}</div>
                <div className="text-xs text-champagne-gold">负责人</div>
              </div>
              <ChevronRight size={16} className="text-stone-gray" />
            </Card>
          </Link>
        ))}
      </div>
    )}

    {/* 成员列表 */}
    <div>
      <h3 className="text-xs text-stone-gray mb-2 uppercase tracking-wider">项目成员</h3>
      {members.filter(m => !leaders.some(l => l.id === m.id)).map((member) => (
        <Link
          key={member.id}
          to={`/partners/${member.id}`}
        >
          <Card className="p-3 mb-2 flex items-center gap-3">
            <Avatar name={member.name} size="md" />
            <div className="flex-1">
              <div className="font-medium text-ink-black">{member.name}</div>
              <div className="text-xs text-stone-gray">
                加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            <ChevronRight size={16} className="text-stone-gray" />
          </Card>
        </Link>
      ))}
    </div>
  </motion.div>
);

// 股权 Tab
const SharesTab: React.FC<{ 
  shares: any[];
  canEdit: boolean;
  onEdit: () => void;
}> = ({ shares, canEdit, onEdit }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    {canEdit && (
      <Button variant="secondary" className="w-full mb-4" onClick={onEdit}>
        <Edit3 size={16} className="mr-2" />
        调整股权结构
      </Button>
    )}

    <Card className="overflow-hidden">
      <div className="divide-y divide-silk-gray">
        {shares.map((share, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {share.holderName === '元征' ? (
                <div className="w-10 h-10 rounded-full bg-ink-black flex items-center justify-center text-pure-white text-sm font-medium">
                  元
                </div>
              ) : (
                <Avatar name={share.holderName} size="md" />
              )}
              <div>
                <span className="text-sm text-ink-black font-medium">{share.holderName}</span>
                {share.note && (
                  <p className="text-xs text-stone-gray">{share.note}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-ink-black">{share.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* 股权可视化 */}
    <Card className="p-4 mt-4">
      <h3 className="text-sm font-medium text-ink-black mb-3">股权分布</h3>
      <div className="h-4 rounded-full overflow-hidden flex bg-pearl-white">
        {shares.map((share, index) => (
          <div
            key={index}
            style={{ width: `${share.percentage}%` }}
            className={`h-full ${
              share.holderName === '元征' ? 'bg-ink-black' : 
              index % 2 === 0 ? 'bg-champagne-gold' : 'bg-stone-gray'
            }`}
            title={`${share.holderName}: ${share.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {shares.map((share, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              share.holderName === '元征' ? 'bg-ink-black' : 
              index % 2 === 0 ? 'bg-champagne-gold' : 'bg-stone-gray'
            }`} />
            <span className="text-stone-gray">{share.holderName}</span>
          </div>
        ))}
      </div>
    </Card>
  </motion.div>
);

// 审核弹窗
const ReviewModal: React.FC<{
  onClose: () => void;
  onSubmit: (action: 'approve' | 'reject', reason?: string) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [reason, setReason] = useState('');

  return (
    <Modal isOpen onClose={onClose} title="审核项目">
      <div className="space-y-4">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="备注/驳回原因（选填）"
          className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
        />

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 border-red-500 text-red-500"
            onClick={() => onSubmit('reject', reason)}
            disabled={isLoading}
          >
            驳回
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => onSubmit('approve', reason)}
            disabled={isLoading}
          >
            通过
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// 编辑项目弹窗
const EditProjectModal: React.FC<{
  project: ProjectDetail;
  onClose: () => void;
  onSubmit: (data: Partial<ProjectDetail>) => void;
  isLoading: boolean;
}> = ({ project, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    industry: project.industry || '',
    region: project.region || '',
  });

  return (
    <Modal isOpen onClose={onClose} title="编辑项目信息">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-stone-gray mb-1">项目名称</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-gray mb-1">项目描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-gray mb-1">行业</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-gray mb-1">地区</label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
            />
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => onSubmit(formData)}
          disabled={isLoading}
        >
          {isLoading ? '保存中...' : '保存修改'}
        </Button>
      </div>
    </Modal>
  );
};

// 添加事件弹窗
const AddEventModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateProjectEventDto) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<CreateProjectEventDto>({
    title: '',
    description: '',
    eventType: 'NOTE',
  });

  return (
    <Modal isOpen onClose={onClose} title="添加进程记录">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-stone-gray mb-1">事件类型</label>
          <select
            value={formData.eventType}
            onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })}
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          >
            <option value="NOTE">备注</option>
            <option value="MILESTONE_ADDED">里程碑</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-gray mb-1">标题 *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="请输入事件标题"
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-gray mb-1">描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="请输入详细描述..."
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          />
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => onSubmit(formData)}
          disabled={!formData.title.trim() || isLoading}
        >
          {isLoading ? '添加中...' : '添加记录'}
        </Button>
      </div>
    </Modal>
  );
};

// 编辑股权弹窗
const EditSharesModal: React.FC<{
  currentShares: any[];
  onClose: () => void;
  onSubmit: (data: AdjustSharesDto) => void;
  isLoading: boolean;
}> = ({ currentShares, onClose, onSubmit, isLoading }) => {
  // 初始化时将 percentage 转换为数字类型
  const [shares, setShares] = useState(currentShares.map(s => ({ 
    ...s, 
    percentage: Number(s.percentage) || 0 
  })));
  const [reason, setReason] = useState('');
  const [searchTexts, setSearchTexts] = useState<{ [key: number]: string }>({});
  const [searchResults, setSearchResults] = useState<{ [key: number]: UserListItem[] }>({});
  const [searchLoading, setSearchLoading] = useState<{ [key: number]: boolean }>({});

  // 计算总百分比，确保使用数字类型
  const totalPercentage = shares.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  // 使用函数式更新避免状态覆盖问题
  const updateShare = (index: number, field: string, value: any) => {
    setShares(prev => {
      const newShares = [...prev];
      newShares[index] = { ...newShares[index], [field]: value };
      return newShares;
    });
  };

  // 批量更新多个字段
  const updateShareMultiple = (index: number, updates: Record<string, any>) => {
    setShares(prev => {
      const newShares = [...prev];
      newShares[index] = { ...newShares[index], ...updates };
      return newShares;
    });
  };

  const addShare = () => {
    setShares(prev => [...prev, { holderName: '', holderId: undefined, percentage: 0, note: '' }]);
  };

  const removeShare = (index: number) => {
    setShares(prev => {
      if (prev[index].holderName === '元征') return prev; // 不能移除元征
      return prev.filter((_, i) => i !== index);
    });
  };

  // 搜索用户
  const searchUsers = async (index: number, query: string) => {
    setSearchTexts(prev => ({ ...prev, [index]: query }));
    if (!query.trim()) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      return;
    }
    try {
      setSearchLoading(prev => ({ ...prev, [index]: true }));
      const result = await listUsers({ search: query, pageSize: 5 });
      setSearchResults(prev => ({ ...prev, [index]: result.data || [] }));
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearchLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  // 选择用户
  const selectUser = (index: number, user: UserListItem) => {
    // 使用批量更新避免状态覆盖
    updateShareMultiple(index, { holderName: user.name, holderId: user.id });
    setSearchTexts(prev => ({ ...prev, [index]: '' }));
    setSearchResults(prev => ({ ...prev, [index]: [] }));
  };

  // 追踪当前聚焦的输入框索引
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <Modal isOpen onClose={onClose} title="调整股权结构">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {shares.map((share, index) => (
          <div 
            key={index} 
            className="p-3 bg-pearl-white rounded-lg border border-silk-gray"
            style={{ position: 'relative', zIndex: focusedIndex === index ? 20 : 1 }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                {/* 持有人名称输入 */}
                <div className="relative">
                  <input
                    type="text"
                    value={share.holderName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      // 使用批量更新，同时更新 holderName 和清除 holderId
                      updateShareMultiple(index, { holderName: newValue, holderId: undefined });
                      searchUsers(index, newValue);
                    }}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => {
                      // 延迟清除，以便点击搜索结果时不会立即关闭
                      setTimeout(() => setFocusedIndex(null), 200);
                    }}
                    placeholder="输入或搜索持有人"
                    disabled={share.holderName === '元征'}
                    className="w-full px-3 py-2 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30 disabled:bg-gray-100"
                  />
                  {share.holderId && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      已关联
                    </span>
                  )}
                  {/* 搜索结果下拉 */}
                  {searchResults[index]?.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-silk-gray rounded-lg shadow-lg z-30 max-h-40 overflow-y-auto">
                      {searchResults[index].map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => selectUser(index, user)}
                          className="w-full px-3 py-2 text-left hover:bg-pearl-white flex items-center gap-2"
                        >
                          <Avatar name={user.name} size="sm" />
                          <div>
                            <p className="text-sm text-ink-black">{user.name}</p>
                            {user.organization && (
                              <p className="text-xs text-stone-gray">{user.organization}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchLoading[index] && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-silk-gray rounded-lg shadow-lg z-30 p-2 text-center text-sm text-stone-gray">
                      搜索中...
                    </div>
                  )}
                </div>
                
                {/* 占比和备注 */}
                <div className="flex gap-2">
                  <div className="relative w-28">
                    <input
                      type="number"
                      value={share.percentage}
                      onChange={(e) => updateShare(index, 'percentage', Number(e.target.value) || 0)}
                      placeholder="占比"
                      min={0}
                      max={100}
                      step={0.01}
                      disabled={share.holderName === '元征'}
                      className="w-full px-3 py-2 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30 disabled:bg-gray-100 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-gray">%</span>
                  </div>
                  <input
                    type="text"
                    value={share.note || ''}
                    onChange={(e) => updateShare(index, 'note', e.target.value)}
                    placeholder="备注（选填）"
                    className="flex-1 px-3 py-2 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
                  />
                </div>
              </div>
              
              {share.holderName !== '元征' && (
                <button
                  type="button"
                  onClick={() => removeShare(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        <Button variant="secondary" className="w-full" onClick={addShare}>
          <Plus size={16} className="mr-2" />
          添加持有人
        </Button>

        <div className={`p-3 rounded-lg ${Math.abs(totalPercentage - 100) < 0.01 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
            股权合计: {totalPercentage.toFixed(2)}% {Math.abs(totalPercentage - 100) >= 0.01 && '(必须等于100%)'}
          </p>
        </div>

        <div>
          <label className="block text-xs text-stone-gray mb-1">变更原因 <span className="text-red-500">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请说明股权变更原因..."
            className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
          />
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            // 清理数据：确保数据格式正确
            const cleanedShares = shares.map(s => ({
              holderName: s.holderName.trim(),
              holderId: s.holderId && typeof s.holderId === 'string' && s.holderId.trim() ? s.holderId : undefined,
              percentage: Number(s.percentage) || 0,
              note: s.note?.trim() || undefined,
            }));
            onSubmit({ shares: cleanedShares, reason: reason.trim() });
          }}
          disabled={Math.abs(totalPercentage - 100) >= 0.01 || !reason.trim() || isLoading}
        >
          {isLoading ? '保存中...' : '保存变更'}
        </Button>
      </div>
    </Modal>
  );
};

// 添加成员弹窗
const AddMemberModal: React.FC<{
  projectId: string;
  existingMemberIds: string[];
  onClose: () => void;
}> = ({ projectId, existingMemberIds, onClose }) => {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [role, setRole] = useState<'LEADER' | 'MEMBER'>('MEMBER');
  const [responsibility, setResponsibility] = useState('');
  const [sharePercentage, setSharePercentage] = useState(0);
  const queryClient = useQueryClient();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    try {
      setLoading(true);
      const result = await listUsers({ search: query, pageSize: 10 });
      setUsers((result.data || []).filter(u => !existingMemberIds.includes(u.id)));
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 直接添加成员（管理员/负责人操作）
  const inviteMutation = useMutation({
    mutationFn: () => addMember(projectId, {
      userId: selectedUser!.id,
      role,
      responsibility: responsibility || undefined,
      intendedSharePercentage: sharePercentage || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onClose();
    },
  });

  return (
    <Modal isOpen onClose={onClose} title="邀请成员加入项目">
      <div className="space-y-4">
        {!selectedUser ? (
          <>
            <div>
              <label className="block text-xs text-stone-gray mb-1">搜索用户</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="输入用户名搜索..."
                className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loading size="md" />
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-pearl-white rounded-lg transition-colors text-left"
                  >
                    <Avatar name={user.name} size="md" />
                    <div>
                      <p className="font-medium text-ink-black">{user.name}</p>
                      {user.organization && (
                        <p className="text-xs text-stone-gray">{user.organization}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchText ? (
              <p className="text-center py-4 text-stone-gray">未找到匹配用户</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-pearl-white rounded-lg">
              <Avatar name={selectedUser.name} size="lg" />
              <div className="flex-1">
                <p className="font-medium text-ink-black">{selectedUser.name}</p>
                {selectedUser.organization && (
                  <p className="text-sm text-stone-gray">{selectedUser.organization}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 hover:bg-white rounded"
              >
                <X size={16} className="text-stone-gray" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-stone-gray mb-1">角色</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'LEADER' | 'MEMBER')}
                className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              >
                <option value="MEMBER">成员</option>
                <option value="LEADER">负责人</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-gray mb-1">职责描述</label>
              <input
                type="text"
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
                placeholder="该成员在项目中的职责..."
                className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-gray mb-1">预期股权占比 (%)</label>
              <input
                type="number"
                value={sharePercentage}
                onChange={(e) => setSharePercentage(Number(e.target.value))}
                min={0}
                max={49}
                className="w-full px-4 py-3 border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => inviteMutation.mutate()}
              disabled={!responsibility.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? '添加中...' : '确认添加'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

// 加入申请列表弹窗
const JoinRequestsModal: React.FC<{
  requests: JoinRequest[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ requests, onClose, onRefresh }) => {
  const reviewMutation = useMutation({
    mutationFn: ({ requestId, action, actualSharePercentage, reason }: {
      requestId: string;
      action: 'approve' | 'reject';
      actualSharePercentage?: number;
      reason?: string;
    }) => reviewJoinRequest(requestId, action, actualSharePercentage, reason),
    onSuccess: () => {
      onRefresh();
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <Modal isOpen onClose={onClose} title="加入申请">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {pendingRequests.length === 0 ? (
          <Empty description="暂无待处理的加入申请" />
        ) : (
          pendingRequests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={request.user.name} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-ink-black">{request.user.name}</p>
                  <p className="text-xs text-stone-gray">
                    申请为 {request.role === 'LEADER' ? '负责人' : '成员'} · 
                    预期股权 {request.intendedSharePercentage}%
                  </p>
                </div>
              </div>
              <p className="text-sm text-charcoal mb-2">{request.responsibility}</p>
              {request.note && (
                <p className="text-xs text-stone-gray mb-3">{request.note}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 border-red-500 text-red-500"
                  onClick={() => reviewMutation.mutate({
                    requestId: request.id,
                    action: 'reject',
                  })}
                  disabled={reviewMutation.isPending}
                >
                  拒绝
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({
                    requestId: request.id,
                    action: 'approve',
                    actualSharePercentage: request.intendedSharePercentage,
                  })}
                  disabled={reviewMutation.isPending}
                >
                  通过
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </Modal>
  );
};

export default ProjectDetailPage;
