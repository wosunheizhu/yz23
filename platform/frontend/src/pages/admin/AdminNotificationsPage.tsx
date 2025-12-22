/**
 * 管理员 - 通知管理页面
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Mail, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Tabs, TabList, Tab } from '../../components/ui';
import { apiClient } from '../../api/client';

interface NotificationOutbox {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  eventType: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  sentAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待发送',
  SENT: '已发送',
  FAILED: '发送失败',
  CANCELLED: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  SENT: 'bg-success/10 text-success',
  FAILED: 'bg-error/10 text-error',
  CANCELLED: 'bg-gallery-gray text-stone-gray',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  PENDING: <Clock size={16} className="text-warning" />,
  SENT: <CheckCircle size={16} className="text-success" />,
  FAILED: <XCircle size={16} className="text-error" />,
  CANCELLED: <AlertTriangle size={16} className="text-stone-gray" />,
};

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState('failed');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationOutbox[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: any = { pageSize: 50 };
      if (activeTab !== 'all') {
        params.status = activeTab.toUpperCase();
      }
      const response = await apiClient.get<{
        success: boolean;
        data: NotificationOutbox[];
        pagination: any;
      }>('/admin/notification-outbox', { params });
      setNotifications(response.data?.data || []);
    } catch (err) {
      console.error('加载通知失败:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setRetrying(id);
      await apiClient.post(`/admin/notification-outbox/${id}/retry`);
      loadNotifications();
    } catch (err) {
      console.error('重试失败:', err);
      alert('重试失败');
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAll = async () => {
    if (!confirm('确定要重试所有失败的通知吗？')) return;
    try {
      setLoading(true);
      await apiClient.post('/admin/notification-outbox/retry-all-failed');
      loadNotifications();
    } catch (err) {
      console.error('重试失败:', err);
      alert('批量重试失败');
    }
  };

  // 注意：取消功能需要后端支持，暂时禁用
  const handleCancel = async (_id: string) => {
    alert('取消功能暂未实现');
  };

  return (
    <SimpleLayout title="通知管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 标签页 */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab value="failed">
              <XCircle size={16} className="mr-1" />
              发送失败
            </Tab>
            <Tab value="pending">
              <Clock size={16} className="mr-1" />
              待发送
            </Tab>
            <Tab value="sent">
              <CheckCircle size={16} className="mr-1" />
              已发送
            </Tab>
            <Tab value="all">
              全部
            </Tab>
          </TabList>
        </Tabs>

        {/* 批量操作 */}
        {activeTab === 'failed' && notifications.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRetryAll}
          >
            <RefreshCw size={16} className="mr-2" />
            重试所有失败通知
          </Button>
        )}

        {/* 通知列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description={`暂无${STATUS_LABELS[activeTab.toUpperCase()] || ''}通知`} />
        ) : (
          <div className="space-y-md">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex items-center gap-md">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-champagne-gold/10`}>
                        <Mail size={20} className="text-champagne-gold" />
                      </div>
                      <div>
                        <p className="font-medium text-deep-black line-clamp-1">
                          {notification.subject || '无主题'}
                        </p>
                        <p className="text-sm text-stone-gray">
                          {notification.userName || '未知用户'} ({notification.userEmail || '-'})
                        </p>
                      </div>
                    </div>
                    <Badge size="sm" className={STATUS_COLORS[notification.status]}>
                      <span className="flex items-center gap-1">
                        {STATUS_ICONS[notification.status]}
                        {STATUS_LABELS[notification.status]}
                      </span>
                    </Badge>
                  </div>

                  <div className="text-sm text-stone-gray mb-md">
                    <p>事件类型: {notification.eventType}</p>
                    <p>创建时间: {new Date(notification.createdAt).toLocaleString()}</p>
                    {notification.sentAt && (
                      <p>发送时间: {new Date(notification.sentAt).toLocaleString()}</p>
                    )}
                    {notification.retryCount > 0 && (
                      <p>重试次数: {notification.retryCount}</p>
                    )}
                  </div>

                  {notification.errorMessage && (
                    <div className="bg-error/5 border border-error/20 rounded-lg p-md mb-md">
                      <p className="text-sm text-error">{notification.errorMessage}</p>
                    </div>
                  )}

                  {(notification.status === 'FAILED' || notification.status === 'PENDING') && (
                    <div className="flex items-center justify-end gap-2">
                      {notification.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(notification.id)}
                        >
                          取消
                        </Button>
                      )}
                      {notification.status === 'FAILED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRetry(notification.id)}
                          disabled={retrying === notification.id}
                        >
                          <RefreshCw size={16} className={`mr-1 ${retrying === notification.id ? 'animate-spin' : ''}`} />
                          {retrying === notification.id ? '重试中...' : '重试'}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SimpleLayout>
  );
}

