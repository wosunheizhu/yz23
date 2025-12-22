/**
 * 私信会话列表页
 * 优化：空状态时直接显示搜索和发起对话功能
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Send, MessageCircle, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Loading, Empty, Avatar, Button } from '@/components/ui';
import { messagesApi, ConversationResponse } from '@/api/messages';
import { listUsers, UserListItem } from '@/api/users';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // 用户搜索相关
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagesApi.listConversations();
      setConversations(response.data?.data || []);
    } catch (error) {
      console.error('加载会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户（用于发起新对话）
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    try {
      setLoadingUsers(true);
      const result = await listUsers({ search: query, pageSize: 10 });
      setUsers(result.data || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 延迟搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showUserSearch) {
        searchUsers(searchText);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, showUserSearch]);

  const filteredConversations = conversations.filter(conv => 
    conv.partnerName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
  };

  // 切换到搜索用户模式
  const handleSearchFocus = () => {
    setShowUserSearch(true);
  };

  // 选择用户发起对话
  const handleSelectUser = (user: UserListItem) => {
    navigate(`/messages/${user.id}`);
  };

  // 返回会话列表
  const handleBackToConversations = () => {
    setShowUserSearch(false);
    setSearchText('');
    setUsers([]);
  };

  return (
    <AppLayout headerTitle="私信" showBottomNav>
      <div className="flex flex-col h-full">
        {/* 搜索框 */}
        <div className="p-4 bg-pure-white border-b border-silk-gray">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-gray" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-pearl-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-champagne-gold/30"
              placeholder={showUserSearch ? "搜索用户发起对话..." : "搜索联系人或发起新对话..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={handleSearchFocus}
            />
          </div>
          {/* 搜索模式提示 */}
          {showUserSearch && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-gray">输入用户名搜索并发起对话</span>
              <button 
                className="text-xs text-champagne-gold"
                onClick={handleBackToConversations}
              >
                返回会话列表
              </button>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loading size="lg" />
            </div>
          ) : showUserSearch ? (
            // 用户搜索结果
            <div>
              {loadingUsers ? (
                <div className="flex items-center justify-center h-20">
                  <Loading size="md" />
                </div>
              ) : searchText && users.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-stone-gray">没有找到用户 "{searchText}"</p>
                </div>
              ) : searchText ? (
                <div className="divide-y divide-silk-gray">
                  {users.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        className="w-full p-4 flex items-center gap-3 hover:bg-pearl-white transition-colors text-left"
                        onClick={() => handleSelectUser(user)}
                      >
                        <Avatar name={user.name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-black truncate">{user.name}</p>
                          {user.organization && (
                            <p className="text-sm text-stone-gray truncate">{user.organization}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-champagne-gold">
                          <Send size={16} />
                          <span className="text-sm">发消息</span>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MessageCircle size={40} className="mx-auto text-silk-gray mb-3" />
                  <p className="text-stone-gray">输入用户名开始搜索</p>
                </div>
              )}
            </div>
          ) : filteredConversations.length === 0 ? (
            // 空状态 - 引导用户发起对话
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-20 h-20 bg-pearl-white rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={40} className="text-stone-gray" />
              </div>
              <h3 className="text-lg font-medium text-ink-black mb-2">暂无私信</h3>
              <p className="text-stone-gray text-center mb-6">
                点击上方搜索框，搜索用户发起对话
              </p>
              <Button 
                variant="primary"
                onClick={handleSearchFocus}
              >
                <Send size={16} className="mr-2" />
                发起新对话
              </Button>
            </div>
          ) : (
            // 会话列表
            <div className="divide-y divide-silk-gray">
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.partnerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    className="w-full p-4 flex items-center gap-3 hover:bg-pearl-white transition-colors text-left"
                    onClick={() => navigate(`/messages/${conversation.partnerId}`)}
                  >
                    <div className="relative">
                      <Avatar 
                        src={conversation.partnerAvatar} 
                        name={conversation.partnerName || '未知'} 
                        size="lg" 
                      />
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-ink-black truncate">
                          {conversation.partnerName}
                        </span>
                        <span className="text-xs text-stone-gray flex-shrink-0">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-stone-gray truncate">
                        {conversation.lastMessage || '暂无消息'}
                      </p>
                    </div>
                    
                    <ChevronRight size={16} className="text-stone-gray flex-shrink-0" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
