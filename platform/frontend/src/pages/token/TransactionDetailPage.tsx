/**
 * 交易详情页面
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  User,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Loading, Empty, Avatar, Button, Badge } from '../../components/ui';
import { getTransaction, confirmTransaction, TokenTransaction, TRANSACTION_DIRECTION_LABELS, TRANSACTION_STATUS_LABELS } from '../../api/tokens';
import { useAuthStore } from '../../stores/authStore';


export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [transaction, setTransaction] = useState<TokenTransaction | null>(null);

  useEffect(() => {
    if (id) {
      loadTransaction(id);
    }
  }, [id]);

  const loadTransaction = async (txId: string) => {
    try {
      setLoading(true);
      const tx = await getTransaction(txId);
      setTransaction(tx);
    } catch (err) {
      console.error('Failed to load transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // 收款方确认转账
  const handleConfirm = async (accept: boolean) => {
    if (!id) return;
    
    const comment = accept ? '' : prompt('请输入拒绝原因：');
    if (!accept && comment === null) return; // 用户取消
    
    try {
      setConfirming(true);
      await confirmTransaction(id, { accept, comment: comment || undefined });
      // 重新加载交易详情
      await loadTransaction(id);
      alert(accept ? '已确认收款' : '已拒绝转账');
    } catch (err) {
      console.error('确认失败:', err);
      alert('操作失败，请重试');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout title="交易详情">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!transaction) {
    return (
      <SimpleLayout title="交易详情">
        <Empty description="交易记录不存在" />
      </SimpleLayout>
    );
  }

  const typeLabel = TRANSACTION_DIRECTION_LABELS[transaction.direction] || '其他';
  
  // 根据当前用户角色判断是收入还是支出
  const isReceiving = transaction.toUserId === user?.id;
  const isPositive = isReceiving || ['ADMIN_GRANT', 'DIVIDEND', 'MEETING_INVITE_REWARD', 'ONSITE_VISIT_REWARD'].includes(transaction.direction);
  
  // 判断是否可以确认收款（状态为待收款确认且当前用户是收款方）
  const canConfirm = transaction.status === 'PENDING_RECEIVER_CONFIRM' && isReceiving;
  
  // 交易对方名称
  let counterpartyName = '';
  if (transaction.direction === 'TRANSFER') {
    counterpartyName = isReceiving ? transaction.fromUserName || '' : transaction.toUserName || '';
  } else {
    counterpartyName = transaction.toUserName || transaction.fromUserName || '';
  }

  return (
    <SimpleLayout title="交易详情">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 金额显示 */}
        <Card variant={isPositive ? 'featured' : 'default'} className="p-xl text-center">
          <div className="w-16 h-16 mx-auto mb-md rounded-full bg-gallery-gray flex items-center justify-center">
            {isPositive ? (
              <ArrowUpRight size={32} className="text-success" />
            ) : (
              <ArrowDownRight size={32} className="text-error" />
            )}
          </div>
          <p className={`font-display text-display-xl ${isPositive ? 'text-success' : 'text-deep-black'}`}>
            {isPositive ? '+' : '-'}{transaction.amount.toLocaleString()}
          </p>
          <p className="text-sm mt-sm text-stone-gray">{typeLabel}</p>
          
          {/* 交易状态 */}
          {transaction.status && transaction.status !== 'COMPLETED' && (
            <div className="mt-md">
              <Badge 
                size="md" 
                variant={
                  transaction.status === 'PENDING_ADMIN_APPROVAL' ? 'warning' :
                  transaction.status === 'PENDING_RECEIVER_CONFIRM' ? 'info' :
                  transaction.status === 'REJECTED' ? 'error' :
                  transaction.status === 'CANCELLED' ? 'default' :
                  'default'
                }
              >
                <Clock size={12} className="mr-1" />
                {TRANSACTION_STATUS_LABELS[transaction.status] || transaction.status}
              </Badge>
            </div>
          )}
        </Card>
        
        {/* 收款确认操作 */}
        {canConfirm && (
          <Card className="p-lg">
            <p className="text-sm text-stone-gray mb-md text-center">
              {transaction.fromUserName} 向您发起了 {transaction.amount.toLocaleString()} Token 转账，请确认是否接收
            </p>
            <div className="flex gap-md">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleConfirm(false)}
                disabled={confirming}
              >
                <XCircle size={16} className="mr-2" />
                拒绝
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleConfirm(true)}
                disabled={confirming}
              >
                <CheckCircle size={16} className="mr-2" />
                确认收款
              </Button>
            </div>
          </Card>
        )}

        {/* 详细信息 */}
        <Card className="divide-y divide-silk-gray">
          {/* 交易对象 */}
          {counterpartyName && (
            <div className="flex items-center justify-between p-md">
              <div className="flex items-center gap-md text-stone-gray">
                <User size={16} />
                <span className="text-sm">{isPositive ? '来自' : '转给'}</span>
              </div>
              <div className="flex items-center gap-sm">
                <Avatar name={counterpartyName} size="xs" />
                <span className="text-body text-deep-black">{counterpartyName}</span>
              </div>
            </div>
          )}

          {/* 交易时间 */}
          <div className="flex items-center justify-between p-md">
            <div className="flex items-center gap-md text-stone-gray">
              <Calendar size={16} />
              <span className="text-sm">时间</span>
            </div>
            <span className="text-body text-deep-black">
              {new Date(transaction.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </span>
          </div>

          {/* 交易类型 */}
          <div className="flex items-center justify-between p-md">
            <div className="flex items-center gap-md text-stone-gray">
              <Wallet size={16} />
              <span className="text-sm">类型</span>
            </div>
            <span className={`text-body ${isPositive ? 'text-success' : 'text-stone-gray'}`}>{typeLabel}</span>
          </div>

          {/* 备注 */}
          {transaction.reason && (
            <div className="p-md">
              <div className="flex items-center gap-md text-stone-gray mb-sm">
                <FileText size={16} />
                <span className="text-sm">备注</span>
              </div>
              <p className="text-body text-deep-black pl-6">{transaction.reason}</p>
            </div>
          )}
        </Card>

        {/* 交易ID */}
        <div className="text-center">
          <p className="text-tiny text-stone-gray">交易编号</p>
          <p className="text-xs text-charcoal font-mono mt-xs">{transaction.id}</p>
        </div>
      </motion.div>
    </SimpleLayout>
  );
}

