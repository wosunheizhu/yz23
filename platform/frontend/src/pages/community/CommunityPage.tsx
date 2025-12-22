/**
 * 社群动态页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, MoreHorizontal, Plus, Trash2, Flag, Copy
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Loading, Empty, Tabs, Avatar, Modal, Button } from '@/components/ui';
import { communityApi, PostResponse } from '@/api/community';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuthStore } from '@/stores/authStore';

type TabKey = 'latest' | 'following' | 'hot';

export default function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const query: any = { pageSize: 20 };
      
      if (activeTab === 'following') {
        query.scope = 'following';
      } else if (activeTab === 'hot') {
        query.sort = 'hot';
      }
      
      const response = await communityApi.listPosts(query);
      // 后端返回格式: { data: [...], pagination: {...} }
      const postsData = response.data?.data || response.data || [];
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, isLikedByMe: boolean) => {
    try {
      if (isLikedByMe) {
        await communityApi.unlikePost(postId);
      } else {
        await communityApi.likePost(postId);
      }
      // 更新本地状态
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLikedByMe: !isLikedByMe,
            likeCount: isLikedByMe ? post.likeCount - 1 : post.likeCount + 1,
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const tabs = [
    { key: 'latest' as TabKey, label: '最新' },
    { key: 'following' as TabKey, label: '关注' },
    { key: 'hot' as TabKey, label: '热门' },
  ];

  const handleDeletePost = async () => {
    if (!deletePostId) return;
    try {
      await communityApi.deletePost(deletePostId);
      setPosts(prev => prev.filter(p => p.id !== deletePostId));
      setDeletePostId(null);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('内容已复制');
    setMenuPostId(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return format(date, 'M月d日', { locale: zhCN });
    }
  };

  return (
    <AppLayout 
      header={{ title: '社群' }}
      showBottomNav
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full"
      >
        {/* 顶部标签 */}
        <div className="px-4 pt-4 bg-pure-white">
          <Tabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
          />
        </div>

        {/* 动态列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loading size="lg" />
            </div>
          ) : posts.length === 0 ? (
            <Empty description="暂无动态" />
          ) : (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4">
                    {/* 头部 */}
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => navigate(`/partners/${post.authorId}`)}
                      >
                        <Avatar 
                          src={post.authorAvatar} 
                          name={post.authorName || '未知'} 
                          size="md" 
                        />
                        <div>
                          <p className="text-sm font-medium text-ink-black">
                            {post.authorName}
                          </p>
                          <p className="text-xs text-stone-gray">
                            {formatTime(post.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          className="p-1 hover:bg-pearl-white rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuPostId(menuPostId === post.id ? null : post.id);
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4 text-stone-gray" />
                        </button>
                        
                        {/* 操作菜单 */}
                        <AnimatePresence>
                          {menuPostId === post.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-8 z-20 bg-pure-white rounded-lg shadow-lg border border-silk-gray py-1 min-w-[120px]"
                            >
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-stone-gray hover:bg-pearl-white flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyContent(post.content);
                                }}
                              >
                                <Copy size={14} />
                                复制内容
                              </button>
                              {post.authorId === user?.id && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-pearl-white flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletePostId(post.id);
                                    setMenuPostId(null);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  删除动态
                                </button>
                              )}
                              {post.authorId !== user?.id && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm text-stone-gray hover:bg-pearl-white flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert('举报已提交');
                                    setMenuPostId(null);
                                  }}
                                >
                                  <Flag size={14} />
                                  举报
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* 内容 */}
                    <div 
                      className="cursor-pointer"
                      onClick={() => navigate(`/community/posts/${post.id}`)}
                    >
                      <p className="text-sm text-ink-black whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      {/* 图片 */}
                      {post.images && post.images.length > 0 && (
                        <div className={`grid gap-2 mb-3 ${
                          post.images.length === 1 ? 'grid-cols-1' :
                          post.images.length === 2 ? 'grid-cols-2' :
                          'grid-cols-3'
                        }`}>
                          {post.images.slice(0, 9).map((img: string, i: number) => (
                            <div 
                              key={i} 
                              className="aspect-square rounded-lg overflow-hidden bg-pearl-white"
                            >
                              <img 
                                src={img} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 底部操作 */}
                    <div className="flex items-center gap-6 pt-3 border-t border-silk-gray">
                      <button 
                        className="flex items-center gap-1.5 text-stone-gray hover:text-red-500 transition-colors"
                        onClick={() => handleLike(post.id, post.isLikedByMe || false)}
                      >
                        <Heart 
                          className={`w-4 h-4 ${post.isLikedByMe ? 'fill-red-500 text-red-500' : ''}`} 
                        />
                        <span className="text-xs">{post.likeCount || 0}</span>
                      </button>
                      <button 
                        className="flex items-center gap-1.5 text-stone-gray hover:text-ink-black transition-colors"
                        onClick={() => navigate(`/community/posts/${post.id}`)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.commentCount || 0}</span>
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 发布按钮 */}
        <motion.button
          className="fixed bottom-20 right-4 w-12 h-12 bg-ink-black text-pure-white rounded-full shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/community/create')}
        >
          <Plus className="w-5 h-5" />
        </motion.button>

        {/* 点击空白处关闭菜单 */}
        {menuPostId && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setMenuPostId(null)}
          />
        )}
      </motion.div>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        title="删除动态"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-gray">
            确定要删除这条动态吗？删除后无法恢复。
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeletePostId(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={handleDeletePost}
            >
              删除
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
