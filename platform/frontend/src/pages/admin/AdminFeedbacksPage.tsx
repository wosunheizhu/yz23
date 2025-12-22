/**
 * 管理员 - 反馈管理页面
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Modal } from '../../components/ui';
import { get, post } from '../../api/client';

interface Feedback {
  id: string;
  type: string;
  content: string;
  status: string;
  reply: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: '待处理', color: 'bg-amber-100 text-amber-700', icon: <Clock size={14} /> },
  PROCESSING: { label: '处理中', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  RESOLVED: { label: '已解决', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
  REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> },
};

const TYPE_LABELS: Record<string, string> = {
  BUG: '问题反馈',
  SUGGESTION: '功能建议',
  OTHER: '其他',
};

export default function AdminFeedbacksPage() {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reply, setReply] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await get<{ data: Feedback[] }>('/feedbacks/admin/list');
      setFeedbacks(response.data || []);
    } catch (err) {
      console.error('加载反馈失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (status: string) => {
    if (!selectedFeedback) return;
    
    try {
      setProcessing(true);
      await post(`/feedbacks/${selectedFeedback.id}/process`, {
        status,
        reply: reply || undefined,
      });
      setShowModal(false);
      setSelectedFeedback(null);
      setReply('');
      loadFeedbacks();
    } catch (err) {
      console.error('处理反馈失败:', err);
      alert('处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const openDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setReply(feedback.reply || '');
    setShowModal(true);
  };

  return (
    <SimpleLayout title="反馈管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : feedbacks.length === 0 ? (
          <Empty description="暂无反馈" />
        ) : (
          <div className="space-y-md">
            {feedbacks.map((feedback) => {
              const statusConfig = STATUS_CONFIG[feedback.status] || STATUS_CONFIG.PENDING;
              return (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card 
                    className="p-lg cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openDetail(feedback)}
                  >
                    <div className="flex items-start gap-md">
                      <div className="w-10 h-10 rounded-full bg-champagne-gold/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={20} className="text-champagne-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-deep-black">{feedback.createdBy.name}</span>
                          <Badge size="sm" className={statusConfig.color}>
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-stone-gray mb-2">
                          {TYPE_LABELS[feedback.type] || feedback.type}
                        </p>
                        <p className="text-sm text-ink-black line-clamp-2">{feedback.content}</p>
                        <p className="text-xs text-stone-gray mt-2">
                          {new Date(feedback.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-stone-gray flex-shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 详情模态框 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="反馈详情"
      >
        {selectedFeedback && (
          <div className="space-y-md">
            <div>
              <p className="text-sm text-stone-gray mb-1">提交人</p>
              <p className="font-medium">{selectedFeedback.createdBy.name}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray mb-1">类型</p>
              <p>{TYPE_LABELS[selectedFeedback.type] || selectedFeedback.type}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray mb-1">内容</p>
              <p className="text-sm bg-gallery-gray p-3 rounded-gallery">{selectedFeedback.content}</p>
            </div>
            <div>
              <p className="text-sm text-stone-gray mb-1">回复</p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="输入回复内容..."
                className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-md">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleProcess('REJECTED')}
                disabled={processing}
              >
                拒绝
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleProcess('RESOLVED')}
                disabled={processing}
              >
                {processing ? '处理中...' : '解决'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SimpleLayout>
  );
}
