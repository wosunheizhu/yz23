/**
 * 新建私信对话页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Send } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Loading, Empty, Avatar, Input, Button } from '@/components/ui';
import { listUsers, UserListItem } from '@/api/users';
import { dmApi } from '@/api/messages';
import { useAuthStore } from '@/stores/authStore';

export default function NewConversationPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await listUsers({ 
        search: searchQuery, 
        page: 1, 
        pageSize: 20 
      });
      // 过滤掉自己
      const filtered = (response.data || []).filter(
        (u) => u.id !== currentUser?.id
      );
      setUsers(filtered);
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
    setSearchQuery('');
    setUsers([]);
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedUser) return;
    
    try {
      setSending(true);
      await dmApi.send({ 
        receiverId: selectedUser.id,
        content: messageText.trim() 
      });
      
      // 发送成功后跳转到对话页
      navigate(`/messages/${selectedUser.id}`, { replace: true });
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout 
      showBottomNav={false}
      headerProps={{
        title: '新建私信',
        showBack: true,
        onBack: () => navigate('/messages'),
      }}
    >
      <div className="flex flex-col h-full">
        {/* 选择收件人 */}
        <div className="p-4 border-b border-silk-gray">
          {selectedUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={selectedUser.avatar}
                  name={selectedUser.name}
                  size="sm"
                />
                <div>
                  <div className="font-medium text-ink-black">
                    {selectedUser.name}
                  </div>
                  <div className="text-xs text-stone-gray">
                    {selectedUser.company || selectedUser.title || '合伙人'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-sm text-rose-gold"
              >
                更换
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-gray" />
              <input
                type="text"
                placeholder="搜索合伙人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-silk-gray rounded-lg text-sm focus:outline-none focus:border-rose-gold"
              />
            </div>
          )}
        </div>

        {/* 搜索结果 */}
        {!selectedUser && (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loading size="sm" />
              </div>
            ) : users.length > 0 ? (
              <div className="divide-y divide-silk-gray/50">
                {users.map((user) => (
                  <motion.button
                    key={user.id}
                    className="w-full p-4 flex items-center gap-3 hover:bg-off-white/50 transition-colors text-left"
                    onClick={() => handleSelectUser(user)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Avatar
                      src={user.avatar}
                      name={user.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink-black truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-stone-gray truncate">
                        {user.company || user.title || '合伙人'}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : searchQuery ? (
              <Empty message="未找到相关用户" />
            ) : (
              <div className="flex items-center justify-center py-12 text-stone-gray text-sm">
                请输入用户名进行搜索
              </div>
            )}
          </div>
        )}

        {/* 消息输入框（选择用户后显示） */}
        {selectedUser && (
          <div className="flex-1 flex flex-col">
            {/* 空白消息区域 */}
            <div className="flex-1 flex items-center justify-center text-stone-gray text-sm">
              开始与 {selectedUser.name} 的对话
            </div>
            
            {/* 输入框 */}
            <div className="p-4 border-t border-silk-gray bg-pure-white">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="输入消息..."
                    className="w-full p-3 border border-silk-gray rounded-lg text-sm resize-none focus:outline-none focus:border-rose-gold min-h-[44px] max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  loading={sending}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

