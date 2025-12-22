/**
 * 公告列表页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, ChevronRight, Pin } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Modal } from '@/components/ui';
import { announcementsApi, AnnouncementResponse } from '@/api/announcements';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementResponse | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementsApi.listAnnouncements({ pageSize: 50 });
      // 后端返回格式: { data: [...], pagination: {...} }
      const announcementData = response.data?.data || response.data || [];
      setAnnouncements(Array.isArray(announcementData) ? announcementData : []);
    } catch (error) {
      console.error('加载公告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
      HIGH: { label: '重要', variant: 'primary' },
      NORMAL: { label: '一般', variant: 'secondary' },
      LOW: { label: '普通', variant: 'secondary' },
    };
    const info = map[priority] || { label: priority, variant: 'secondary' as const };
    return priority === 'HIGH' ? <Badge variant={info.variant} size="sm">{info.label}</Badge> : null;
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="公告" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  // 分离置顶和普通公告
  const pinnedAnnouncements = announcements.filter(a => a.isPinned);
  const normalAnnouncements = announcements.filter(a => !a.isPinned);

  return (
    <AppLayout showBottomNav={false} headerTitle="公告" showBack>
      <div className="p-4 space-y-4">
        {announcements.length === 0 ? (
          <Empty description="暂无公告" />
        ) : (
          <>
            {/* 置顶公告 */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-stone-gray flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  置顶公告
                </h3>
                {pinnedAnnouncements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="p-4 cursor-pointer border-l-4 border-l-ink-black"
                      onClick={() => setSelectedAnnouncement(announcement)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-ink-black flex-1 pr-2 line-clamp-2">
                          {announcement.title}
                        </h3>
                        {getPriorityBadge(announcement.priority)}
                      </div>
                      
                      {announcement.summary && (
                        <p className="text-sm text-stone-gray line-clamp-2 mb-2">
                          {announcement.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-stone-gray">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(announcement.createdAt), 'M月d日 HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 普通公告 */}
            {normalAnnouncements.length > 0 && (
              <div className="space-y-3">
                {pinnedAnnouncements.length > 0 && (
                  <h3 className="text-xs font-medium text-stone-gray">全部公告</h3>
                )}
                {normalAnnouncements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (pinnedAnnouncements.length + index) * 0.05 }}
                  >
                    <Card 
                      className="p-4 cursor-pointer hover:bg-pearl-white transition-colors"
                      onClick={() => setSelectedAnnouncement(announcement)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <h3 className="font-medium text-ink-black line-clamp-2">
                              {announcement.title}
                            </h3>
                            {getPriorityBadge(announcement.priority)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-stone-gray">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(new Date(announcement.createdAt), 'M月d日', { locale: zhCN })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-gray flex-shrink-0 mt-1" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 公告详情弹窗 */}
      <Modal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title || '公告详情'}
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-stone-gray">
              <Clock className="w-3 h-3" />
              <span>
                {format(new Date(selectedAnnouncement.createdAt), 'yyyy年M月d日 HH:mm', { locale: zhCN })}
              </span>
              {selectedAnnouncement.isPinned && (
                <Badge variant="secondary" size="sm">置顶</Badge>
              )}
            </div>
            
            <div 
              className="prose prose-sm max-w-none text-ink-black"
              dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
