/**
 * Token 账户页面
 * 显示余额和交易记录
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  Send,
  History,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge } from '../../components/ui';
import {
  getMyAccount,
  getMyTransactions,
  TokenAccount,
  TokenTransaction,
  TRANSACTION_DIRECTION_LABELS,
  TRANSACTION_STATUS_LABELS,
} from '../../api/tokens';
import { useAuthStore } from '../../stores/authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 交易类型图标映射
const getTransactionIcon = (direction: string, isPositive: boolean) => {
  // 对于转账类型，根据是收款还是付款决定图标
  if (direction === 'TRANSFER') {
    return isPositive 
      ? <ArrowUpRight size={16} className="text-success" />
      : <ArrowDownRight size={16} className="text-error" />;
  }
  
  switch (direction) {
    case 'ADMIN_GRANT':
    case 'DIVIDEND':
    case 'MEETING_INVITE_REWARD':
    case 'ONSITE_VISIT_REWARD':
      return <ArrowUpRight size={16} className="text-success" />;
    case 'ADMIN_DEDUCT':
      return <ArrowDownRight size={16} className="text-error" />;
    default:
      return <Wallet size={16} className="text-stone-gray" />;
  }
};

export default function TokenPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<TokenAccount | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountData, txData] = await Promise.all([
        getMyAccount(),
        getMyTransactions({ page: 1, pageSize: 20 }),
      ]);
      setAccount(accountData);
      setTransactions(txData.items || []);
      setHasMore(txData.page < txData.totalPages);
    } catch (err) {
      console.error('Failed to load token data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const txData = await getMyTransactions({ page: nextPage, pageSize: 20 });
      setTransactions([...transactions, ...(txData.items || [])]);
      setPage(nextPage);
      setHasMore(nextPage < txData.totalPages);
    } catch (err) {
      console.error('Failed to load more transactions:', err);
    }
  };

  if (loading) {
    return (
      <SimpleLayout title="Token 账户">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="Token 账户">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 余额卡片 */}
        <motion.section variants={itemVariants}>
          <Card variant="dark" className="p-xl">
            <p className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-xs">
              可用余额
            </p>
            <p className="font-display text-display-xl text-champagne-gold mb-sm">
              {(account?.availableBalance ?? account?.balance ?? 0).toLocaleString()}
            </p>
            {/* 冻结金额提示 */}
            {account?.frozenAmount > 0 && (
              <p className="text-xs text-stone-gray mb-lg">
                含冻结 {account.frozenAmount.toLocaleString()} Token（转账审核中）
              </p>
            )}
            
            <div className="flex gap-md">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate('/token/transfer')}
              >
                <Send size={16} className="mr-2" />
                转账
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => navigate('/token/history')}
              >
                <History size={16} className="mr-2" />
                明细
              </Button>
            </div>
          </Card>
        </motion.section>

        {/* 账户信息 */}
        {account && (
          <motion.section variants={itemVariants}>
            <div className="grid grid-cols-2 gap-md">
              <Card className="p-md text-center">
                <p className="text-tiny text-stone-gray mb-xs">初始额度</p>
                <p className="font-display text-title text-deep-black">
                  {account.initialAmount?.toLocaleString() || '-'}
                </p>
              </Card>
              <Card className="p-md text-center">
                <p className="text-tiny text-stone-gray mb-xs">已使用</p>
                <p className="font-display text-title text-deep-black">
                  {((account.initialAmount || 0) - (account.balance || 0)).toLocaleString()}
                </p>
              </Card>
            </div>
          </motion.section>
        )}

        {/* 交易记录 */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-md">
            <h3 className="section-title">最近交易</h3>
            <button 
              onClick={() => navigate('/token/history')}
              className="text-caption text-stone-gray hover:text-champagne-gold transition-colors flex items-center gap-xs"
            >
              查看全部 <ChevronRight size={14} />
            </button>
          </div>

          {transactions.length === 0 ? (
            <Empty description="暂无交易记录" />
          ) : (
            <div className="space-y-sm">
              {transactions.map((tx) => {
                // 根据当前用户角色判断是收入还是支出
                const isReceiving = tx.toUserId === user?.id;
                const isPositive = isReceiving || tx.direction === 'ADMIN_GRANT' || tx.direction === 'DIVIDEND' || tx.direction === 'MEETING_INVITE_REWARD' || tx.direction === 'ONSITE_VISIT_REWARD';
                
                // 显示交易对方名称
                let displayName = tx.reason || '-';
                if (tx.direction === 'TRANSFER') {
                  displayName = isReceiving ? `来自 ${tx.fromUserName || '未知'}` : `转给 ${tx.toUserName || '未知'}`;
                } else if (tx.toUserName) {
                  displayName = tx.toUserName;
                } else if (tx.fromUserName) {
                  displayName = tx.fromUserName;
                }
                
                return (
                  <Card
                    key={tx.id}
                    interactive
                    onClick={() => navigate(`/token/transactions/${tx.id}`)}
                    className="p-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-full bg-gallery-gray flex items-center justify-center">
                          {getTransactionIcon(tx.direction, isPositive)}
                        </div>
                        <div>
                          <p className="text-body text-deep-black">
                            {TRANSACTION_DIRECTION_LABELS[tx.direction] || tx.direction}
                          </p>
                          <p className="text-tiny text-stone-gray">
                            {displayName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-title ${isPositive ? 'text-success' : 'text-deep-black'}`}>
                          {isPositive ? '+' : '-'}{tx.amount.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          {tx.status && tx.status !== 'COMPLETED' && (
                            <Badge 
                              size="sm" 
                              variant={
                                tx.status === 'PENDING_ADMIN_APPROVAL' ? 'warning' :
                                tx.status === 'PENDING_RECEIVER_CONFIRM' ? 'info' :
                                tx.status === 'REJECTED' ? 'error' : 
                                'default'
                              }
                            >
                              {TRANSACTION_STATUS_LABELS[tx.status]}
                            </Badge>
                          )}
                          <span className="text-tiny text-stone-gray">
                            {new Date(tx.createdAt).toLocaleDateString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {hasMore && (
                <Button variant="ghost" className="w-full" onClick={loadMore}>
                  加载更多
                </Button>
              )}
            </div>
          )}
        </motion.section>
      </motion.div>
    </SimpleLayout>
  );
}

