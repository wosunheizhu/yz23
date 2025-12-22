/**
 * 收件箱页面
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  MessageCircle,
  AtSign,
  AlertCircle,
  CheckCircle,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Tabs } from '../../components/ui';
import { listInbox, markInboxAsRead, markAllInboxAsRead, InboxItemResponse, InboxCategory } from '../../api/inbox';

// 分类标签映射
const INBOX_CATEGORY_LABELS: Record<InboxCategory, string> = {
  SYSTEM: '系统通知',
  PROJECT: '项目更新',
  DEMAND: '需求动态',
  RESPONSE: '响应通知',
  TOKEN: 'Token 变动',
  MEETING: '会议通知',
  BOOKING: '预约通知',
  NETWORK: '人脉动态',
  COMMUNITY: '社群互动',
  DM: '私信',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  SYSTEM: <Bell size={18} />,
  ANNOUNCEMENT: <AlertCircle size={18} />,
  DM: <MessageCircle size={18} />,
  MENTION: <AtSign size={18} />,
  PROJECT: <AlertCircle size={18} />,
  DEMAND: <AlertCircle size={18} />,
  RESPONSE: <AlertCircle size={18} />,
  TOKEN: <AlertCircle size={18} />,
  MEETING: <AlertCircle size={18} />,
  BOOKING: <AlertCircle size={18} />,
  NETWORK: <AlertCircle size={18} />,
  COMMUNITY: <MessageCircle size={18} />,
  FEEDBACK: <MessageCircle size={18} />,
};

// 分类颜色映射
const categoryColors: Record<string, string> = {
  SYSTEM: 'bg-info/10 text-info',
  ANNOUNCEMENT: 'bg-error/10 text-error',
  VOTE: 'bg-warning/10 text-warning',
  DM: 'bg-success/10 text-success',
  MENTION: 'bg-rose-gold/10 text-rose-gold',
};

export default function InboxPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const loadItems = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setPage(1);
      }

      const result = await listInbox({
        page: isLoadMore ? page + 1 : 1,
        pageSize: 20,
        unread: activeTab === 'unread' ? 'true' : undefined,
      });

      if (isLoadMore) {
        setItems([...items, ...(result.data || [])]);
        setPage(page + 1);
      } else {
        setItems(result.data || []);
      }

      setHasMore((isLoadMore ? page + 1 : 1) < result.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load inbox items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markInboxAsRead(id);
      setItems(items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllInboxAsRead();
      setItems(items.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleItemClick = (item: InboxItemResponse) => {
    // 标记为已读
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }

    // 根据类型跳转
    if (item.relatedObjectType && item.relatedObjectId) {
      switch (item.relatedObjectType) {
        case 'PROJECT':
          navigate(`/projects/${item.relatedObjectId}`);
          break;
        case 'DEMAND':
          navigate(`/demands/${item.relatedObjectId}`);
          break;
        case 'RESPONSE':
          navigate(`/responses/${item.relatedObjectId}`);
          break;
        case 'MEETING':
          navigate(`/meetings/${item.relatedObjectId}`);
          break;
        case 'POST':
          navigate(`/community/posts/${item.relatedObjectId}`);
          break;
        default:
          break;
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'unread', label: '未读' },
  ];

  const unreadCount = items.filter((item) => !item.isRead).length;

  if (loading && items.length === 0) {
    return (
      <AppLayout header={{ title: '消息', showBack: true }}>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout header={{ title: '消息', showBack: true }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 分类标签 */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'all' | 'unread')}
          />
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCircle size={14} className="mr-1" />
              全部已读
            </Button>
          )}
        </motion.div>

        {/* 私信入口 */}
        <motion.div variants={itemVariants}>
          <Card
            interactive
            onClick={() => navigate('/messages')}
            className="p-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <MessageCircle size={18} className="text-success" />
                </div>
                <span className="text-body text-deep-black">私信</span>
              </div>
              <ChevronRight size={16} className="text-stone-gray" />
            </div>
          </Card>
        </motion.div>

        {/* 消息列表 */}
        {items.length === 0 ? (
          <Empty
            icon={<Bell size={48} className="text-stone-gray" />}
            description={activeTab === 'unread' ? '没有未读消息' : '暂无消息'}
          />
        ) : (
          <div className="space-y-sm">
            {items.map((item) => (
              <motion.div key={item.id} variants={itemVariants}>
                <Card
                  interactive
                  onClick={() => handleItemClick(item)}
                  className={`p-md ${!item.isRead ? 'border-l-2 border-l-champagne-gold' : ''}`}
                >
                  <div className="flex items-start gap-md">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${categoryColors[item.category] || 'bg-gallery-gray text-stone-gray'}`}>
                      {categoryIcons[item.category] || <Bell size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-xs">
                        <span className="text-tiny text-stone-gray">
                          {INBOX_CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <span className="text-tiny text-stone-gray">{formatTime(item.createdAt)}</span>
                      </div>
                      <p className="text-body text-deep-black font-medium line-clamp-1 mb-xs">
                        {item.title}
                      </p>
                      {item.content && (
                        <p className="text-sm text-stone-gray line-clamp-2">
                          {item.content}
                        </p>
                      )}
                    </div>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-champagne-gold flex-shrink-0 mt-2" />
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => loadItems(true)}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
