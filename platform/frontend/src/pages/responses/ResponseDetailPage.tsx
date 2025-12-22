/**
 * 响应详情页面
 * PRD 6.3.6 需求响应审核与资源使用流程
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Briefcase,
  Coins,
  Percent,
  MessageSquare,
  ChevronRight,
  Award,
  Ban,
  Edit3,
  Gavel,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Avatar, Input, Modal } from '../../components/ui';
import {
  getResponseById,
  reviewResponse,
  confirmUsage,
  modifyOrAbandon,
  confirmModifyOrAbandon,
  adminArbitrate,
  ResponseDetail,
  RESPONSE_STATUS_LABELS,
  RESPONSE_STATUS_COLORS,
} from '../../api/responses';
import { useAuthStore } from '../../stores/authStore';

export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ResponseDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 审核响应模态框
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'accept' | 'reject'>('accept');
  const [reviewData, setReviewData] = useState({
    finalSharePercentage: '',
    finalTokenAmount: '',
    finalOther: '',
    rejectReason: '',
  });

  // 确认资源使用模态框
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageNote, setUsageNote] = useState('');

  // 修改/废弃模态框
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyAction, setModifyAction] = useState<'modify' | 'abandon'>('modify');
  const [modifyData, setModifyData] = useState({
    reason: '',
    newSharePercentage: '',
    newTokenAmount: '',
    newOther: '',
  });

  // 资源方确认模态框
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmDecision, setConfirmDecision] = useState<'accept' | 'reject'>('accept');
  const [confirmComment, setConfirmComment] = useState('');

  // 管理员裁决模态框
  const [showArbitrateModal, setShowArbitrateModal] = useState(false);
  const [arbitrateDecision, setArbitrateDecision] = useState<'approve_modify' | 'approve_abandon' | 'continue_original'>('continue_original');
  const [arbitrateData, setArbitrateData] = useState({
    comment: '',
    finalSharePercentage: '',
    finalTokenAmount: '',
    finalOther: '',
  });

  useEffect(() => {
    if (id) {
      loadResponse(id);
    }
  }, [id]);

  const loadResponse = async (responseId: string) => {
    try {
      setLoading(true);
      const data = await getResponseById(responseId);
      setResponse(data);
    } catch (err) {
      console.error('Failed to load response:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 检查权限
  const isResponder = user?.id === response?.responder?.id;
  const isAdmin = user?.isAdmin;
  // 判断是否可以审核：
  // 1. 管理员可以审核
  // 2. 需求发布者/项目负责人可以审核（包括自己响应自己需求的情况）
  // 注：即使是响应者，如果同时是需求方也可以审核自己的响应
  const canReview = (isAdmin || response?.status === 'SUBMITTED');
  // 确认资源使用：已接受待使用状态 或 条款修改后的状态
  const canConfirmUsage = (isAdmin || response?.status === 'ACCEPTED_PENDING_USAGE' || response?.status === 'MODIFIED');
  // 修改/废弃：已接受待使用状态 或 条款修改后的状态
  const canModifyOrAbandon = (isAdmin || response?.status === 'ACCEPTED_PENDING_USAGE' || response?.status === 'MODIFIED');
  // 资源方确认：只有响应者且非发起人可以确认
  const canConfirmModifyAbandon = isResponder && (
    response?.status === 'PENDING_MODIFY_CONFIRM' || 
    response?.status === 'PENDING_ABANDON_CONFIRM'
  );
  const canArbitrate = isAdmin && response?.status === 'PENDING_ADMIN_ARBITRATION';

  // 审核响应
  const handleReview = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await reviewResponse(id, {
        action: reviewAction,
        ...(reviewAction === 'accept' ? {
          finalSharePercentage: reviewData.finalSharePercentage ? Number(reviewData.finalSharePercentage) : undefined,
          finalTokenAmount: reviewData.finalTokenAmount ? Number(reviewData.finalTokenAmount) : undefined,
          finalOther: reviewData.finalOther || undefined,
        } : {
          rejectReason: reviewData.rejectReason,
        }),
      });
      setShowReviewModal(false);
      setReviewData({ finalSharePercentage: '', finalTokenAmount: '', finalOther: '', rejectReason: '' });
      await loadResponse(id);
    } catch (err) {
      console.error('Review failed:', err);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 确认资源使用
  const handleConfirmUsage = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await confirmUsage(id, usageNote || undefined);
      setShowUsageModal(false);
      setUsageNote('');
      await loadResponse(id);
    } catch (err: any) {
      console.error('Confirm usage failed:', err);
      alert(err.response?.data?.message || '操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 发起修改/废弃
  const handleModifyOrAbandon = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await modifyOrAbandon(
        id,
        modifyAction,
        modifyData.reason,
        modifyAction === 'modify' ? {
          newSharePercentage: modifyData.newSharePercentage ? Number(modifyData.newSharePercentage) : undefined,
          newTokenAmount: modifyData.newTokenAmount ? Number(modifyData.newTokenAmount) : undefined,
          newOther: modifyData.newOther || undefined,
        } : undefined
      );
      setShowModifyModal(false);
      setModifyData({ reason: '', newSharePercentage: '', newTokenAmount: '', newOther: '' });
      await loadResponse(id);
    } catch (err) {
      console.error('Modify/abandon failed:', err);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 资源方确认
  const handleConfirmModifyAbandon = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await confirmModifyOrAbandon(id, confirmDecision, confirmComment || undefined);
      setShowConfirmModal(false);
      setConfirmComment('');
      await loadResponse(id);
    } catch (err) {
      console.error('Confirm failed:', err);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 管理员裁决
  const handleArbitrate = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await adminArbitrate(
        id,
        arbitrateDecision,
        arbitrateData.comment || undefined,
        arbitrateDecision === 'approve_modify' ? {
          finalSharePercentage: arbitrateData.finalSharePercentage ? Number(arbitrateData.finalSharePercentage) : undefined,
          finalTokenAmount: arbitrateData.finalTokenAmount ? Number(arbitrateData.finalTokenAmount) : undefined,
          finalOther: arbitrateData.finalOther || undefined,
        } : undefined
      );
      setShowArbitrateModal(false);
      setArbitrateData({ comment: '', finalSharePercentage: '', finalTokenAmount: '', finalOther: '' });
      await loadResponse(id);
    } catch (err) {
      console.error('Arbitrate failed:', err);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout title="响应详情">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!response) {
    return (
      <SimpleLayout title="响应详情">
        <Empty description="响应不存在" />
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="响应详情">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-lg"
      >
        {/* 状态卡片 */}
        <Card className="p-lg">
          <div className="flex items-center justify-between mb-md">
            <Badge size="sm" className={RESPONSE_STATUS_COLORS[response.status] || 'bg-gallery-gray text-stone-gray'}>
              {RESPONSE_STATUS_LABELS[response.status] || response.status}
            </Badge>
            <span className="text-tiny text-stone-gray">{formatDate(response.createdAt)}</span>
          </div>

          {/* 响应人信息 */}
          <div className="flex items-center gap-md mb-lg">
            <Avatar name={response.responder?.name || ''} src={response.responder?.avatar || undefined} size="lg" />
            <div>
              <p className="text-body font-medium text-deep-black">{response.responder?.name}</p>
              <p className="text-tiny text-stone-gray">响应人</p>
            </div>
          </div>

          {/* 关联需求和项目 */}
          <div className="space-y-sm text-sm">
            <button
              onClick={() => navigate(`/demands/${response.demandId}`)}
              className="flex items-center gap-md text-left w-full hover:bg-gallery-gray p-sm rounded-lg transition-colors"
            >
              <FileText size={16} className="text-stone-gray" />
              <span className="flex-1 text-charcoal">需求: {response.demandName}</span>
              <ChevronRight size={16} className="text-stone-gray" />
            </button>
            <button
              onClick={() => navigate(`/projects/${response.projectId}`)}
              className="flex items-center gap-md text-left w-full hover:bg-gallery-gray p-sm rounded-lg transition-colors"
            >
              <Briefcase size={16} className="text-stone-gray" />
              <span className="flex-1 text-charcoal">项目: {response.projectName}</span>
              <ChevronRight size={16} className="text-stone-gray" />
            </button>
          </div>
        </Card>

        {/* 响应内容 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md flex items-center gap-sm">
            <MessageSquare size={18} className="text-champagne-gold" />
            响应内容
          </h3>
          <p className="text-body text-charcoal whitespace-pre-wrap">
            {response.content}
          </p>
          {response.note && (
            <div className="mt-md pt-md border-t border-silk-gray">
              <p className="text-tiny text-stone-gray mb-sm">备注</p>
              <p className="text-sm text-charcoal">{response.note}</p>
            </div>
          )}
        </Card>

        {/* 激励条款 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md flex items-center gap-sm">
            <Award size={18} className="text-champagne-gold" />
            激励条款
          </h3>
          
          {/* 意向激励 */}
          <div className="mb-md">
            <p className="text-tiny text-stone-gray mb-sm">意向激励</p>
            <div className="flex flex-wrap gap-sm">
              {response.intendedSharePercentage && (
                <div className="flex items-center gap-xs px-md py-sm bg-gallery-gray rounded-full">
                  <Percent size={14} className="text-champagne-gold" />
                  <span className="text-sm text-charcoal">股份 {response.intendedSharePercentage}%</span>
                </div>
              )}
              {response.intendedTokenAmount && (
                <div className="flex items-center gap-xs px-md py-sm bg-gallery-gray rounded-full">
                  <Coins size={14} className="text-champagne-gold" />
                  <span className="text-sm text-charcoal">Token {response.intendedTokenAmount}</span>
                </div>
              )}
              {response.intendedOther && (
                <div className="flex items-center gap-xs px-md py-sm bg-gallery-gray rounded-full">
                  <span className="text-sm text-charcoal">{response.intendedOther}</span>
                </div>
              )}
              {!response.intendedSharePercentage && !response.intendedTokenAmount && !response.intendedOther && (
                <span className="text-sm text-stone-gray">未指定</span>
              )}
            </div>
          </div>

          {/* 最终激励（已接受后显示） */}
          {(response.status === 'ACCEPTED_PENDING_USAGE' || 
            response.status === 'USED' || 
            response.status === 'MODIFIED') && (
            <div className="pt-md border-t border-silk-gray">
              <p className="text-tiny text-stone-gray mb-sm">最终激励</p>
              <div className="flex flex-wrap gap-sm">
                {response.finalSharePercentage && (
                  <div className="flex items-center gap-xs px-md py-sm bg-success/10 rounded-full">
                    <Percent size={14} className="text-success" />
                    <span className="text-sm text-success">股份 {response.finalSharePercentage}%</span>
                  </div>
                )}
                {response.finalTokenAmount && (
                  <div className="flex items-center gap-xs px-md py-sm bg-success/10 rounded-full">
                    <Coins size={14} className="text-success" />
                    <span className="text-sm text-success">Token {response.finalTokenAmount}</span>
                  </div>
                )}
                {response.finalOther && (
                  <div className="flex items-center gap-xs px-md py-sm bg-success/10 rounded-full">
                    <span className="text-sm text-success">{response.finalOther}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 拒绝原因（如果被拒绝） */}
        {response.status === 'REJECTED' && response.rejectReason && (
          <Card className="p-lg bg-error/5 border-error/20">
            <h3 className="section-title mb-md flex items-center gap-sm text-error">
              <XCircle size={18} />
              拒绝原因
            </h3>
            <p className="text-body text-charcoal">{response.rejectReason}</p>
          </Card>
        )}

        {/* 修改原因（如果被修改/废弃） */}
        {(response.status === 'MODIFIED' || response.status === 'ABANDONED') && response.modifyReason && (
          <Card className="p-lg bg-warning/5 border-warning/20">
            <h3 className="section-title mb-md flex items-center gap-sm text-warning">
              <AlertTriangle size={18} />
              {response.status === 'ABANDONED' ? '废弃原因' : '修改原因'}
            </h3>
            <p className="text-body text-charcoal">{response.modifyReason}</p>
          </Card>
        )}

        {/* 关联人脉资源 */}
        {response.networkResources && response.networkResources.length > 0 && (
          <Card className="p-lg">
            <h3 className="section-title mb-md flex items-center gap-sm">
              <User size={18} className="text-champagne-gold" />
              关联人脉资源
            </h3>
            <div className="space-y-sm">
              {response.networkResources.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => navigate(`/network-resources/${resource.id}`)}
                  className="w-full flex items-center justify-between p-md bg-gallery-gray rounded-gallery hover:bg-silk-gray transition-colors"
                >
                  <div>
                    <p className="text-body text-deep-black">{resource.name || '未知'}</p>
                    {resource.organization && (
                      <p className="text-tiny text-stone-gray">{resource.organization}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-stone-gray" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* 操作按钮区域 */}
        <div className="space-y-md pb-safe">
          {/* 审核响应（待审核状态，非响应者可操作） */}
          {response.status === 'SUBMITTED' && canReview && (
            <div className="flex gap-md">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setReviewAction('accept');
                  setReviewData({
                    finalSharePercentage: response.intendedSharePercentage?.toString() || '',
                    finalTokenAmount: response.intendedTokenAmount?.toString() || '',
                    finalOther: response.intendedOther || '',
                    rejectReason: '',
                  });
                  setShowReviewModal(true);
                }}
              >
                <CheckCircle size={16} className="mr-2" />
                接受响应
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setReviewAction('reject');
                  setShowReviewModal(true);
                }}
              >
                <XCircle size={16} className="mr-2" />
                拒绝响应
              </Button>
            </div>
          )}

          {/* 确认资源使用（已接受待使用状态 或 条款修改后状态） */}
          {(response.status === 'ACCEPTED_PENDING_USAGE' || response.status === 'MODIFIED') && canConfirmUsage && (
            <>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowUsageModal(true)}
              >
                <CheckCircle size={16} className="mr-2" />
                确认资源已使用 / 发起结算
              </Button>
              <div className="flex gap-md">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setModifyAction('modify');
                    setModifyData({
                      reason: '',
                      newSharePercentage: response.finalSharePercentage?.toString() || '',
                      newTokenAmount: response.finalTokenAmount?.toString() || '',
                      newOther: response.finalOther || '',
                    });
                    setShowModifyModal(true);
                  }}
                >
                  <Edit3 size={16} className="mr-2" />
                  修改条款
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-error"
                  onClick={() => {
                    setModifyAction('abandon');
                    setModifyData({ reason: '', newSharePercentage: '', newTokenAmount: '', newOther: '' });
                    setShowModifyModal(true);
                  }}
                >
                  <Ban size={16} className="mr-2" />
                  废弃响应
                </Button>
              </div>
            </>
          )}

          {/* 资源方确认（待资源方确认状态，响应者可操作） */}
          {canConfirmModifyAbandon && (
            <Card className="p-lg bg-warning/5 border-warning/20">
              <h3 className="text-body font-medium text-warning mb-md flex items-center gap-sm">
                <AlertTriangle size={18} />
                {response.status === 'PENDING_MODIFY_CONFIRM' ? '项目方申请修改条款' : '项目方申请废弃此响应'}
              </h3>
              <p className="text-sm text-charcoal mb-md">请确认是否同意此申请，拒绝后将由管理员裁决。</p>
              <div className="flex gap-md">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    setConfirmDecision('accept');
                    setShowConfirmModal(true);
                  }}
                >
                  同意
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setConfirmDecision('reject');
                    setShowConfirmModal(true);
                  }}
                >
                  拒绝
                </Button>
              </div>
            </Card>
          )}

          {/* 管理员裁决（待裁决状态，管理员可操作） */}
          {canArbitrate && (
            <Card className="p-lg bg-info/5 border-info/20">
              <h3 className="text-body font-medium text-info mb-md flex items-center gap-sm">
                <Gavel size={18} />
                需要管理员裁决
              </h3>
              <p className="text-sm text-charcoal mb-md">资源方拒绝了修改/废弃申请，请进行裁决。</p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowArbitrateModal(true)}
              >
                <Gavel size={16} className="mr-2" />
                进行裁决
              </Button>
            </Card>
          )}

          {/* 已使用状态提示 */}
          {response.status === 'USED' && (
            <Card className="p-lg bg-success/5 border-success/20">
              <div className="flex items-center gap-md">
                <CheckCircle size={24} className="text-success" />
                <div>
                  <p className="text-body font-medium text-success">资源已使用</p>
                  <p className="text-sm text-charcoal">此响应已完成结算流程</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </motion.div>

      {/* 审核响应模态框 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={reviewAction === 'accept' ? '接受响应' : '拒绝响应'}
      >
        <div className="space-y-lg">
          {reviewAction === 'accept' ? (
            <>
              <p className="text-sm text-stone-gray">
                请确认最终激励条款（可与意向激励不同）
              </p>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">股份比例 (%)</label>
                <Input
                  type="number"
                  value={reviewData.finalSharePercentage}
                  onChange={(e) => setReviewData({ ...reviewData, finalSharePercentage: e.target.value })}
                  placeholder="例如：5"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">Token 数量</label>
                <Input
                  type="number"
                  value={reviewData.finalTokenAmount}
                  onChange={(e) => setReviewData({ ...reviewData, finalTokenAmount: e.target.value })}
                  placeholder="例如：1000"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">其他激励</label>
                <Input
                  value={reviewData.finalOther}
                  onChange={(e) => setReviewData({ ...reviewData, finalOther: e.target.value })}
                  placeholder="其他激励形式说明"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs text-stone-gray mb-sm">拒绝原因 *</label>
              <textarea
                className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
                rows={4}
                value={reviewData.rejectReason}
                onChange={(e) => setReviewData({ ...reviewData, rejectReason: e.target.value })}
                placeholder="请说明拒绝原因..."
              />
            </div>
          )}
          <div className="flex gap-md pt-md">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowReviewModal(false)}
            >
              取消
            </Button>
            <Button
              variant={reviewAction === 'accept' ? 'primary' : 'danger'}
              className="flex-1"
              onClick={handleReview}
              loading={actionLoading}
              disabled={reviewAction === 'reject' && !reviewData.rejectReason.trim()}
            >
              确认{reviewAction === 'accept' ? '接受' : '拒绝'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 确认资源使用模态框 */}
      <Modal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        title="确认资源已使用"
      >
        <div className="space-y-lg">
          <p className="text-sm text-charcoal">
            确认资源已实际使用后，系统将记录到项目时间线。
            如需结算 Token，请在确认后前往 Token 页面发起转账。
          </p>
          <div>
            <label className="block text-xs text-stone-gray mb-sm">备注（选填）</label>
            <textarea
              className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              rows={3}
              value={usageNote}
              onChange={(e) => setUsageNote(e.target.value)}
              placeholder="补充说明..."
            />
          </div>
          <div className="flex gap-md pt-md">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowUsageModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirmUsage}
              loading={actionLoading}
            >
              确认已使用
            </Button>
          </div>
        </div>
      </Modal>

      {/* 修改/废弃模态框 */}
      <Modal
        isOpen={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        title={modifyAction === 'modify' ? '修改激励条款' : '废弃响应'}
      >
        <div className="space-y-lg">
          <div>
            <label className="block text-xs text-stone-gray mb-sm">
              {modifyAction === 'modify' ? '修改原因' : '废弃原因'} *
            </label>
            <textarea
              className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              rows={3}
              value={modifyData.reason}
              onChange={(e) => setModifyData({ ...modifyData, reason: e.target.value })}
              placeholder={modifyAction === 'modify' ? '请说明为何需要修改激励条款...' : '请说明为何需要废弃此响应...'}
            />
          </div>
          {modifyAction === 'modify' && (
            <>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">新股份比例 (%)</label>
                <Input
                  type="number"
                  value={modifyData.newSharePercentage}
                  onChange={(e) => setModifyData({ ...modifyData, newSharePercentage: e.target.value })}
                  placeholder="例如：3"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">新 Token 数量</label>
                <Input
                  type="number"
                  value={modifyData.newTokenAmount}
                  onChange={(e) => setModifyData({ ...modifyData, newTokenAmount: e.target.value })}
                  placeholder="例如：500"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">新其他激励</label>
                <Input
                  value={modifyData.newOther}
                  onChange={(e) => setModifyData({ ...modifyData, newOther: e.target.value })}
                  placeholder="其他激励形式说明"
                />
              </div>
            </>
          )}
          <p className="text-xs text-stone-gray">
            提交后将发送给资源方确认，若资源方拒绝将由管理员裁决。
          </p>
          <div className="flex gap-md pt-md">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowModifyModal(false)}
            >
              取消
            </Button>
            <Button
              variant={modifyAction === 'modify' ? 'primary' : 'danger'}
              className="flex-1"
              onClick={handleModifyOrAbandon}
              loading={actionLoading}
              disabled={!modifyData.reason.trim()}
            >
              提交申请
            </Button>
          </div>
        </div>
      </Modal>

      {/* 资源方确认模态框 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmDecision === 'accept' ? '同意申请' : '拒绝申请'}
      >
        <div className="space-y-lg">
          <p className="text-sm text-charcoal">
            {confirmDecision === 'accept' 
              ? '确认后将按照项目方的申请执行。'
              : '拒绝后将由管理员进行裁决。'}
          </p>
          <div>
            <label className="block text-xs text-stone-gray mb-sm">补充说明（选填）</label>
            <textarea
              className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              rows={3}
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
              placeholder="补充说明..."
            />
          </div>
          <div className="flex gap-md pt-md">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowConfirmModal(false)}
            >
              取消
            </Button>
            <Button
              variant={confirmDecision === 'accept' ? 'primary' : 'danger'}
              className="flex-1"
              onClick={handleConfirmModifyAbandon}
              loading={actionLoading}
            >
              确认{confirmDecision === 'accept' ? '同意' : '拒绝'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 管理员裁决模态框 */}
      <Modal
        isOpen={showArbitrateModal}
        onClose={() => setShowArbitrateModal(false)}
        title="管理员裁决"
      >
        <div className="space-y-lg">
          <div>
            <label className="block text-xs text-stone-gray mb-sm">裁决结果 *</label>
            <select
              className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              value={arbitrateDecision}
              onChange={(e) => setArbitrateDecision(e.target.value as any)}
            >
              <option value="continue_original">继续执行原条款</option>
              <option value="approve_modify">批准修改条款</option>
              <option value="approve_abandon">批准废弃响应</option>
            </select>
          </div>
          {arbitrateDecision === 'approve_modify' && (
            <>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">最终股份比例 (%)</label>
                <Input
                  type="number"
                  value={arbitrateData.finalSharePercentage}
                  onChange={(e) => setArbitrateData({ ...arbitrateData, finalSharePercentage: e.target.value })}
                  placeholder="例如：3"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">最终 Token 数量</label>
                <Input
                  type="number"
                  value={arbitrateData.finalTokenAmount}
                  onChange={(e) => setArbitrateData({ ...arbitrateData, finalTokenAmount: e.target.value })}
                  placeholder="例如：500"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-gray mb-sm">最终其他激励</label>
                <Input
                  value={arbitrateData.finalOther}
                  onChange={(e) => setArbitrateData({ ...arbitrateData, finalOther: e.target.value })}
                  placeholder="其他激励形式说明"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-stone-gray mb-sm">裁决说明（选填）</label>
            <textarea
              className="w-full p-md border border-silk-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              rows={3}
              value={arbitrateData.comment}
              onChange={(e) => setArbitrateData({ ...arbitrateData, comment: e.target.value })}
              placeholder="补充裁决说明..."
            />
          </div>
          <div className="flex gap-md pt-md">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowArbitrateModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleArbitrate}
              loading={actionLoading}
            >
              确认裁决
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}

