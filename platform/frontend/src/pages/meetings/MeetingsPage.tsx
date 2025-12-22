/**
 * 会议列表页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, Users, Video, Plus, Filter
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Tabs, Button, Avatar } from '@/components/ui';
import { meetingsApi, MeetingResponse } from '@/api/meetings';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type TabKey = 'upcoming' | 'past' | 'all';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, [activeTab]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      const query: any = { pageSize: 20 };
      
      if (activeTab === 'upcoming') {
        query.from = now;
        query.status = 'SCHEDULED';
      } else if (activeTab === 'past') {
        query.to = now;
      }
      
      const response = await meetingsApi.listMeetings(query);
      setMeetings(response.data || []);
    } catch (error) {
      console.error('加载会议列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'upcoming' as TabKey, label: '即将开始' },
    { key: 'past' as TabKey, label: '已结束' },
    { key: 'all' as TabKey, label: '全部' },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
      SCHEDULED: { label: '已安排', variant: 'primary' },
      FINISHED: { label: '已结束', variant: 'success' },
      CANCELLED: { label: '已取消', variant: 'secondary' },
    };
    const info = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={info.variant} size="sm">{info.label}</Badge>;
  };

  const getMeetingKindBadge = (kind: string) => {
    return kind === 'COMPANY' ? (
      <Badge variant="primary" size="sm">公司座谈会</Badge>
    ) : (
      <Badge variant="secondary" size="sm">日常会议</Badge>
    );
  };

  return (
    <AppLayout 
      showBottomNav={false} 
      header={{ title: '会议', showBack: true }}
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

        {/* 会议列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loading size="lg" />
            </div>
          ) : meetings.length === 0 ? (
            <Empty 
              description={activeTab === 'upcoming' ? '暂无即将开始的会议' : '暂无会议记录'}
            />
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting, index) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="p-4 cursor-pointer"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-ink-black flex-1 pr-2 line-clamp-2">
                        {meeting.topic}
                      </h3>
                      {getStatusBadge(meeting.status)}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {getMeetingKindBadge(meeting.meetingKind)}
                      {meeting.meetingLevel === 'EXTERNAL' && (
                        <Badge variant="secondary" size="sm">外部</Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-stone-gray">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(meeting.startTime), 'M月d日 EEEE', { locale: zhCN })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(meeting.startTime), 'HH:mm')} - {format(new Date(meeting.endTime), 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {meeting.isOffline ? (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span>{meeting.venue?.name || meeting.location || '待定'}</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3" />
                            <span>线上会议</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 参与者 */}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-silk-gray">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-stone-gray" />
                          <div className="flex -space-x-2">
                            {meeting.participants.slice(0, 5).map((p: any) => (
                              <Avatar 
                                key={p.id} 
                                src={p.user?.avatar} 
                                name={p.user?.name || ''} 
                                size="xs"
                                className="ring-2 ring-pure-white"
                              />
                            ))}
                            {meeting.participants.length > 5 && (
                              <div className="w-6 h-6 rounded-full bg-mist-gray flex items-center justify-center text-xs text-stone-gray ring-2 ring-pure-white">
                                +{meeting.participants.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 创建按钮 */}
        <motion.button
          className="fixed bottom-20 right-4 w-12 h-12 bg-ink-black text-pure-white rounded-full shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/meetings/create')}
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </AppLayout>
  );
}
