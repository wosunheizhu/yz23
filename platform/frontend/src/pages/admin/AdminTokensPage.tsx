/**
 * 管理员 - Token 管理页面
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRightLeft, Gift, Plus, Search } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Avatar, Tabs, TabList, Tab, Modal } from '../../components/ui';
import { tokensApi, TokenTransaction } from '../../api/tokens';
import { usersApi, UserListItem } from '../../api/users';

const STATUS_LABELS: Record<string, string> = {
  PENDING_ADMIN_APPROVAL: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  COMPLETED: '已完成',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ADMIN_APPROVAL: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
  COMPLETED: 'bg-info/10 text-info',
};

export default function AdminTokensPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'transfers');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);

  // 自定义发放模态框
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [activeTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {
        pageSize: 50,
      };
      
      let response;
      if (activeTab === 'all') {
        // 全部记录：使用 getAllTransactions
        response = await tokensApi.getAllTransactions(params);
      } else {
        // 转账审核和自定义发放：使用 getPendingTransactions
        if (activeTab === 'transfers') {
          params.direction = 'TRANSFER';
        } else if (activeTab === 'grants') {
          params.direction = 'ADMIN_GRANT';
        }
        response = await tokensApi.getPendingTransactions(params);
      }
      setTransactions(response?.items || []);
    } catch (err) {
      console.error('加载交易失败:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleApprove = async (transactionId: string) => {
    try {
      await tokensApi.approveTransaction(transactionId);
      loadTransactions();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败');
    }
  };

  const handleReject = async (transactionId: string) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    try {
      await tokensApi.rejectTransaction(transactionId, reason);
      loadTransactions();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败');
    }
  };

  // 搜索用户
  const handleSearchUser = async (query: string) => {
    setUserSearch(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const response = await usersApi.listUsers({ search: query, pageSize: 10 });
      setSearchResults(response.data || []);
    } catch (err) {
      console.error('搜索用户失败:', err);
    } finally {
      setSearching(false);
    }
  };

  // 选择用户
  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
    setUserSearch('');
    setSearchResults([]);
  };

  // 自定义发放Token
  const handleGrant = async () => {
    if (!selectedUser || !grantAmount) {
      alert('请选择用户并输入发放金额');
      return;
    }
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('请输入有效的发放金额');
      return;
    }
    try {
      setGranting(true);
      await tokensApi.adminGrant({
        toUserId: selectedUser.id,
        amount,
        reason: grantReason || '管理员自定义发放',
      });
      alert('发放成功');
      setShowGrantModal(false);
      setSelectedUser(null);
      setGrantAmount('');
      setGrantReason('');
      loadTransactions();
    } catch (err: any) {
      console.error('发放失败:', err);
      alert(err.response?.data?.error?.message || '发放失败');
    } finally {
      setGranting(false);
    }
  };

  return (
    <SimpleLayout title="Token 管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 标签页 */}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <TabList>
            <Tab value="transfers">
              <ArrowRightLeft size={16} className="mr-1" />
              转账审核
            </Tab>
            <Tab value="grants">
              <Gift size={16} className="mr-1" />
              自定义发放
            </Tab>
            <Tab value="all">
              全部记录
            </Tab>
          </TabList>
        </Tabs>

        {/* 自定义发放 - 显示发放按钮 */}
        {activeTab === 'grants' && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowGrantModal(true)}
          >
            <Plus size={18} className="mr-2" />
            发放Token给用户
          </Button>
        )}

        {/* 交易列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <Empty description={activeTab === 'grants' ? '暂无自定义发放记录' : '暂无待处理交易'} />
        ) : (
          <div className="space-y-md">
            {transactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex items-center gap-md">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.direction === 'TRANSFER' ? 'bg-info/10' : 'bg-success/10'
                      }`}>
                        {tx.direction === 'TRANSFER' ? (
                          <ArrowRightLeft size={20} className="text-info" />
                        ) : (
                          <Gift size={20} className="text-success" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-deep-black">
                          {tx.direction === 'TRANSFER' ? 'Token 转账' : 'Token 发放'}
                        </p>
                        <p className="text-sm text-stone-gray">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge size="sm" className={STATUS_COLORS[tx.status] || 'bg-gallery-gray text-stone-gray'}>
                      {STATUS_LABELS[tx.status] || tx.status}
                    </Badge>
                  </div>

                  <div className="bg-gallery-gray rounded-lg p-md mb-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={tx.fromUserName || '系统'} size="sm" />
                        <span className="text-sm text-deep-black">{tx.fromUserName || '系统'}</span>
                      </div>
                      <span className="text-champagne-gold">→</span>
                      <div className="flex items-center gap-2">
                        <Avatar name={tx.toUserName || ''} size="sm" />
                        <span className="text-sm text-deep-black">{tx.toUserName}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-semibold text-champagne-gold">
                        {tx.amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-stone-gray ml-1">Token</span>
                    </div>
                    {tx.reason && (
                      <p className="text-sm text-stone-gray mt-2 text-center">
                        备注: {tx.reason}
                      </p>
                    )}
                  </div>

                  {tx.status === 'PENDING_ADMIN_APPROVAL' && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(tx.id)}
                      >
                        <XCircle size={16} className="mr-1" />
                        拒绝
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(tx.id)}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        通过
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 自定义发放模态框 */}
      <Modal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        title="自定义发放Token"
      >
        <div className="space-y-md">
          {/* 选择用户 */}
          <div>
            <label className="block text-sm text-stone-gray mb-2">选择用户 *</label>
            {selectedUser ? (
              <div className="flex items-center justify-between bg-gallery-gray p-3 rounded-gallery">
                <div className="flex items-center gap-2">
                  <Avatar name={selectedUser.name} size="sm" />
                  <div>
                    <p className="font-medium text-deep-black">{selectedUser.name}</p>
                    <p className="text-xs text-stone-gray">{selectedUser.organization || '-'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  更换
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleSearchUser(e.target.value)}
                    placeholder="搜索用户姓名..."
                    className="w-full pl-10 pr-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
                  />
                </div>
                {/* 搜索结果 */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-pure-white border border-silk-gray rounded-gallery shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-2 p-3 hover:bg-gallery-gray transition-colors text-left"
                      >
                        <Avatar name={user.name} size="sm" />
                        <div>
                          <p className="font-medium text-deep-black">{user.name}</p>
                          <p className="text-xs text-stone-gray">{user.organization || '-'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searching && (
                  <div className="absolute z-10 w-full mt-1 bg-pure-white border border-silk-gray rounded-gallery p-3 text-center">
                    <Loading size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 发放金额 */}
          <div>
            <label className="block text-sm text-stone-gray mb-2">发放金额 *</label>
            <input
              type="number"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="请输入Token数量"
              min="1"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>

          {/* 发放原因 */}
          <div>
            <label className="block text-sm text-stone-gray mb-2">发放原因</label>
            <textarea
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="请输入发放原因（可选）"
              rows={3}
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none resize-none"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-md">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowGrantModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleGrant}
              disabled={granting || !selectedUser || !grantAmount}
            >
              {granting ? '发放中...' : '确认发放'}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}
