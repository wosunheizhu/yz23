/**
 * 动态详情页
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, MoreHorizontal, Send, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Loading, Empty, Avatar, Modal, Button } from '@/components/ui';
import { communityApi, PostResponse, CommentResponse } from '@/api/community';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostResponse | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
      loadComments();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const response = await communityApi.getPost(id!);
      // 处理不同的返回格式
      const postData = response.data?.data || response.data;
      if (postData) {
        setPost(postData);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await communityApi.listComments(id!);
      // 处理不同的返回格式
      const commentsData = response.data?.data || response.data?.items || response.data || [];
      setComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      if (post.isLikedByMe) {
        await communityApi.unlikePost(post.id);
      } else {
        await communityApi.likePost(post.id);
      }
      setPost(prev => prev ? {
        ...prev,
        isLikedByMe: !prev.isLikedByMe,
        likeCount: prev.isLikedByMe ? prev.likeCount - 1 : prev.likeCount + 1,
      } : null);
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    
    try {
      setSubmitting(true);
      await communityApi.createComment(id, { content: commentText.trim() });
      setCommentText('');
      loadComments();
      setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
    } catch (error) {
      console.error('评论失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!id) return;
    try {
      await communityApi.deletePost(id);
      navigate(-1);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="动态详情" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    return (
      <AppLayout showBottomNav={false} headerTitle="动态详情" showBack>
        <Empty description="动态不存在或已删除" />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false} headerTitle="动态详情" showBack>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {/* 动态内容 */}
          <div className="p-4 bg-pure-white">
            {/* 头部 */}
            <div className="flex items-start justify-between mb-4">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/partners/${post.authorId}`)}
              >
                <Avatar 
                  src={post.authorAvatar} 
                  name={post.authorName || '未知'} 
                  size="lg" 
                />
                <div>
                  <p className="font-medium text-ink-black">{post.authorName}</p>
                  <p className="text-xs text-stone-gray">
                    {format(new Date(post.createdAt), 'M月d日 HH:mm', { locale: zhCN })}
                  </p>
                </div>
              </div>
              <button 
                className="p-1 hover:bg-pearl-white rounded"
                onClick={() => setShowDeleteModal(true)}
              >
                <MoreHorizontal className="w-5 h-5 text-stone-gray" />
              </button>
            </div>

            {/* 内容 */}
            <p className="text-ink-black whitespace-pre-wrap mb-4 leading-relaxed">
              {post.content}
            </p>

            {/* 图片 */}
            {post.images && post.images.length > 0 && (
              <div className="space-y-2 mb-4">
                {post.images.map((img: string, i: number) => (
                  <div key={i} className="rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* 操作 */}
            <div className="flex items-center gap-6 py-4 border-t border-b border-silk-gray">
              <button 
                className="flex items-center gap-2 text-stone-gray hover:text-red-500 transition-colors"
                onClick={handleLike}
              >
                <Heart 
                  className={`w-5 h-5 ${post.isLikedByMe ? 'fill-red-500 text-red-500' : ''}`} 
                />
                <span>{post.likeCount || 0} 赞</span>
              </button>
              <div className="flex items-center gap-2 text-stone-gray">
                <MessageCircle className="w-5 h-5" />
                <span>{post.commentCount || 0} 评论</span>
              </div>
            </div>
          </div>

          {/* 评论列表 */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-ink-black mb-4">
              评论 ({comments.length})
            </h3>
            
            {comments.length === 0 ? (
              <p className="text-center text-sm text-stone-gray py-8">
                暂无评论，快来抢沙发
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <Avatar 
                      src={comment.authorAvatar} 
                      name={comment.authorName || ''} 
                      size="sm" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-ink-black">
                          {comment.authorName}
                        </span>
                        <span className="text-xs text-stone-gray">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-black">{comment.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 评论输入框 */}
        <div className="p-4 bg-pure-white border-t border-silk-gray">
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 px-4 py-2 bg-pearl-white rounded-full text-sm focus:outline-none"
              placeholder="写评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
            />
            <button
              className="w-10 h-10 bg-ink-black text-pure-white rounded-full flex items-center justify-center disabled:opacity-50"
              disabled={!commentText.trim() || submitting}
              onClick={handleSubmitComment}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
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
              onClick={() => setShowDeleteModal(false)}
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
