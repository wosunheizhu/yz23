/**
 * Token 转账页面
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, AlertCircle, ChevronDown } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Avatar } from '../../components/ui';
import { getMyAccount, createTransfer } from '../../api/tokens';
import { listUsers, UserListItem } from '../../api/users';

interface UserOption {
  id: string;
  name: string;
  roleLevel: string;
  avatar?: string | null;
}

export default function TokenTransferPage() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBalance = async () => {
    try {
      const account = await getMyAccount();
      // 使用可用余额（扣除冻结金额）
      setBalance(account.availableBalance ?? account.balance ?? 0);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      setShowResults(true);
      const res = await listUsers({ search: query, pageSize: 10 });
      const users = res.data || [];
      setSearchResults(users.map((u: UserListItem) => ({
        id: u.id,
        name: u.name,
        roleLevel: u.roleLevel,
        avatar: u.avatarUrl,
      })));
    } catch (err) {
      console.error('搜索用户失败:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserOption) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError('请选择转账对象');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('请输入有效的转账金额');
      return;
    }

    if (amountNum > balance) {
      setError('余额不足');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createTransfer({
        toUserId: selectedUser.id,
        amount: amountNum,
        reason: reason || '转账',
      });
      navigate('/token', { state: { message: '转账成功' } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '转账失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleLayout title="Token 转账">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 余额显示 */}
        <Card variant="dark" className="p-lg">
          <p className="text-tiny text-stone-gray mb-xs">可用余额</p>
          <p className="font-display text-display-md text-champagne-gold">
            {balance.toLocaleString()}
          </p>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Card className="p-md bg-error/10 border-error/30">
            <div className="flex items-center gap-sm text-error">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </Card>
        )}

        {/* 选择收款人 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            收款人 <span className="text-error">*</span>
          </label>
          
          {selectedUser ? (
            <Card className="p-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <Avatar name={selectedUser.name} src={selectedUser.avatar} size="sm" />
                  <div>
                    <span className="text-body text-deep-black">{selectedUser.name}</span>
                    <p className="text-xs text-stone-gray">{selectedUser.roleLevel}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  更换
                </Button>
              </div>
            </Card>
          ) : (
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 1 && setShowResults(true)}
                  placeholder="输入合伙人姓名搜索"
                  className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-10 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
                />
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-gray pointer-events-none" />
              </div>

              {/* 搜索结果下拉列表 */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-silk-gray rounded-gallery shadow-lg max-h-64 overflow-auto">
                  {loading ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loading size="sm" />
                      <span className="ml-2 text-sm text-stone-gray">搜索中...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gallery-gray active:bg-silk-gray transition-colors text-left border-b border-silk-gray/50 last:border-0"
                      >
                        <Avatar name={user.name} src={user.avatar} size="sm" />
                        <div>
                          <p className="text-body text-deep-black">{user.name}</p>
                          <p className="text-xs text-stone-gray">{user.roleLevel}</p>
                        </div>
                      </button>
                    ))
                  ) : searchQuery.length >= 1 ? (
                    <div className="p-4 text-center text-sm text-stone-gray">
                      未找到匹配的合伙人
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 转账金额 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            转账金额 <span className="text-error">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="请输入转账金额"
            min="1"
            max={balance}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 转账备注 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            备注（选填）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请输入转账备注"
            rows={3}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || !selectedUser || !amount}
        >
          {submitting ? '转账中...' : '确认转账'}
        </Button>
      </motion.div>
    </SimpleLayout>
  );
}
