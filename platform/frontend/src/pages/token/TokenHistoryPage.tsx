/**
 * Token 交易历史页面
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Filter,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge } from '../../components/ui';
import {
  getMyTransactions,
  TokenTransaction,
  TRANSACTION_DIRECTION_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../../api/tokens';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// 交易类型图标映射
const getTransactionIcon = (direction: string) => {
  switch (direction) {
    case 'TRANSFER':
      return <ArrowDownRight size={16} className="text-error" />;
    case 'ADMIN_GRANT':
    case 'DIVIDEND':
    case 'MEETING_INVITE_REWARD':
      return <ArrowUpRight size={16} className="text-success" />;
    case 'ADMIN_DEDUCT':
      return <ArrowDownRight size={16} className="text-error" />;
    default:
      return <Wallet size={16} className="text-stone-gray" />;
  }
};

// 状态颜色
const statusColors: Record<string, string> = {
  PENDING_ADMIN: 'bg-warning/10 text-warning',
  PENDING_RECEIVER: 'bg-info/10 text-info',
  COMPLETED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
  CANCELLED: 'bg-gallery-gray text-stone-gray',
};

export default function TokenHistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterDirection, setFilterDirection] = useState<string>('');

  useEffect(() => {
    loadTransactions(1, filterDirection);
  }, [filterDirection]);

  const loadTransactions = async (pageNum: number, direction?: string) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params: any = { page: pageNum, pageSize: 20 };
      if (direction) params.direction = direction;
      
      const data = await getMyTransactions(params);
      
      if (pageNum === 1) {
        setTransactions(data.items || []);
      } else {
        setTransactions([...transactions, ...(data.items || [])]);
      }
      setPage(pageNum);
      setHasMore(pageNum < data.totalPages);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadTransactions(page + 1, filterDirection);
  };

  if (loading) {
    return (
      <SimpleLayout title="交易明细">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="交易明细">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 筛选 */}
        <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterDirection('')}
            className={`px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              !filterDirection
                ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                : 'border-silk-gray text-stone-gray'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterDirection('TRANSFER')}
            className={`px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              filterDirection === 'TRANSFER'
                ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                : 'border-silk-gray text-stone-gray'
            }`}
          >
            转账
          </button>
          <button
            onClick={() => setFilterDirection('ADMIN_GRANT')}
            className={`px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              filterDirection === 'ADMIN_GRANT'
                ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                : 'border-silk-gray text-stone-gray'
            }`}
          >
            管理员赠与
          </button>
          <button
            onClick={() => setFilterDirection('MEETING_INVITE_REWARD')}
            className={`px-3 py-1.5 text-sm rounded-full border whitespace-nowrap transition-colors ${
              filterDirection === 'MEETING_INVITE_REWARD'
                ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                : 'border-silk-gray text-stone-gray'
            }`}
          >
            座谈会奖励
          </button>
        </motion.div>

        {/* 交易列表 */}
        {transactions.length === 0 ? (
          <Empty description="暂无交易记录" />
        ) : (
          <div className="space-y-sm">
            {transactions.map((tx) => {
              const isPositive = tx.direction === 'ADMIN_GRANT' || tx.direction === 'DIVIDEND' || tx.direction === 'MEETING_INVITE_REWARD';
              const displayName = tx.toUserName || tx.fromUserName || tx.reason || '-';
              
              return (
                <motion.div key={tx.id} variants={itemVariants}>
                  <Card
                    interactive
                    onClick={() => navigate(`/token/transactions/${tx.id}`)}
                    className="p-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-full bg-gallery-gray flex items-center justify-center">
                          {getTransactionIcon(tx.direction)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-body text-deep-black">
                              {TRANSACTION_DIRECTION_LABELS[tx.direction] || tx.direction}
                            </p>
                            <Badge size="sm" className={statusColors[tx.status] || 'bg-gallery-gray text-stone-gray'}>
                              {TRANSACTION_STATUS_LABELS[tx.status] || tx.status}
                            </Badge>
                          </div>
                          <p className="text-tiny text-stone-gray">
                            {displayName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-title ${isPositive ? 'text-success' : 'text-deep-black'}`}>
                          {isPositive ? '+' : '-'}{tx.amount.toLocaleString()}
                        </p>
                        <p className="text-tiny text-stone-gray">
                          {new Date(tx.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {hasMore && (
              <Button variant="ghost" className="w-full" onClick={loadMore}>
                加载更多
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </SimpleLayout>
  );
}






