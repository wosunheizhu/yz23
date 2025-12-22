/**
 * 发布动态页面
 * PRD 17.1: 社群动态
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SimpleLayout } from '@/components/layout';
import { Card, Button, Avatar } from '@/components/ui';
import { communityApi } from '@/api/community';
import { useAuthStore } from '@/stores/authStore';

export default function PostCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('请输入动态内容');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await communityApi.createPost({
        content: content.trim(),
        visibilityScopeType: 'ALL',
      });
      navigate('/community', { replace: true });
    } catch (err: any) {
      console.error('发布失败:', err);
      setError(err.response?.data?.error?.message || '发布失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SimpleLayout
      title="发布动态"
      rightAction={
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              发布中
            </>
          ) : (
            '发布'
          )}
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        {/* 错误提示 */}
        {error && (
          <Card className="p-3 mb-4 bg-error/10 border-error/30">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        {/* 用户信息 */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={user?.name || '用户'} src={user?.avatarUrl} size="md" />
          <div>
            <p className="text-sm font-medium text-ink-black">{user?.name}</p>
            <p className="text-xs text-stone-gray">发布到社群</p>
          </div>
        </div>

        {/* 内容输入 */}
        <Card className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的想法、见闻或经验..."
            className="w-full min-h-[200px] resize-none bg-transparent text-ink-black placeholder:text-stone-gray focus:outline-none"
            maxLength={2000}
          />
          
          {/* 字数统计 */}
          <div className="text-right text-xs text-stone-gray mt-2">
            {content.length}/2000
          </div>
        </Card>
      </motion.div>
    </SimpleLayout>
  );
}

