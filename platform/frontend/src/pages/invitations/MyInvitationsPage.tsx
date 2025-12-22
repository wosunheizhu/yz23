/**
 * 我的邀请历史记录页面
 * 显示用户邀请的所有嘉宾（线下到访 + 座谈会外来嘉宾）
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Calendar, Award, CheckCircle, Clock, XCircle } from 'lucide-react';
import { SimpleLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Tabs, TabList, Tab } from '@/components/ui';
import { onsiteVisitsApi, OnsiteVisit, GUEST_CATEGORY_LABELS } from '@/api/onsite-visits';
import { tokensApi } from '@/api/tokens';

type TabType = 'all' | 'onsite' | 'meeting';

interface MeetingGuest {
  id: string;
  name: string;
  organization: string;
  title?: string;
  guestCategory: string;
  meetingTitle: string;
  meetingDate: string;
  tokenStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  tokenAmount?: number;
  createdAt: string;
}

export default function MyInvitationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [onsiteVisits, setOnsiteVisits] = useState<OnsiteVisit[]>([]);
  const [meetingGuests, setMeetingGuests] = useState<MeetingGuest[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载线下到访和座谈会嘉宾
      const [onsiteRes, tokenTasksRes] = await Promise.allSettled([
        onsiteVisitsApi.getMy(),
        tokensApi.getMyGrantTasks(),
      ]);

      if (onsiteRes.status === 'fulfilled') {
        const data = onsiteRes.value.data?.data || onsiteRes.value.data || [];
        setOnsiteVisits(Array.isArray(data) ? data : []);
      }

      if (tokenTasksRes.status === 'fulfilled') {
        // 从 token grant tasks 提取座谈会嘉宾信息
        // 后端返回格式: { data: [...] }
        const tasks = tokenTasksRes.value.data?.data || tokenTasksRes.value.data || [];
        const tasksArray = Array.isArray(tasks) ? tasks : [];
        const guests: MeetingGuest[] = tasksArray
          .filter((task: any) => task.taskSource === 'MEETING_GUEST' && task.guest)
          .map((task: any) => ({
            id: task.id,
            name: task.guest.name,
            organization: task.guest.organization || '',
            title: task.guest.title,
            guestCategory: task.guest.guestCategory,
            meetingTitle: task.meeting?.topic || '会议',
            meetingDate: task.meeting?.startTime || task.createdAt,
            tokenStatus: task.status,
            tokenAmount: task.finalAmount || task.defaultAmount,
            createdAt: task.createdAt,
          }));
        setMeetingGuests(guests);
      }
    } catch (error) {
      console.error('加载邀请记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success"><CheckCircle size={12} className="mr-1" />已发放</Badge>;
      case 'REJECTED':
        return <Badge variant="warning"><XCircle size={12} className="mr-1" />已拒绝</Badge>;
      default:
        return <Badge variant="new"><Clock size={12} className="mr-1" />待审核</Badge>;
    }
  };

  const allInvitations = [
    ...onsiteVisits.map(v => ({ ...v, type: 'onsite' as const, sortDate: v.visitDate })),
    ...meetingGuests.map(g => ({ ...g, type: 'meeting' as const, sortDate: g.meetingDate })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  const filteredInvitations = activeTab === 'all' 
    ? allInvitations 
    : allInvitations.filter(i => i.type === activeTab);

  const totalOnsiteCount = onsiteVisits.length;
  const totalMeetingCount = meetingGuests.length;
  const approvedCount = [...onsiteVisits, ...meetingGuests].filter(
    (i: any) => i.grantTask?.status === 'APPROVED' || i.tokenStatus === 'APPROVED'
  ).length;

  return (
    <SimpleLayout title="我的邀请记录">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-display text-champagne-gold">{totalOnsiteCount + totalMeetingCount}</p>
            <p className="text-xs text-stone-gray mt-1">总邀请</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-display text-ink-black">{totalOnsiteCount}</p>
            <p className="text-xs text-stone-gray mt-1">线下到访</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-display text-ink-black">{totalMeetingCount}</p>
            <p className="text-xs text-stone-gray mt-1">座谈会嘉宾</p>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabType)} className="mb-4">
          <TabList>
            <Tab value="all">全部 ({allInvitations.length})</Tab>
            <Tab value="onsite">线下到访 ({totalOnsiteCount})</Tab>
            <Tab value="meeting">座谈会嘉宾 ({totalMeetingCount})</Tab>
          </TabList>
        </Tabs>

        {/* 列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : filteredInvitations.length === 0 ? (
          <Empty
            icon={<Users size={48} className="text-stone-gray" />}
            title="暂无邀请记录"
            description="您邀请的嘉宾将显示在这里"
          />
        ) : (
          <div className="space-y-3">
            {filteredInvitations.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={item.type === 'onsite' ? 'default' : 'new'}>
                        {item.type === 'onsite' ? '线下到访' : '座谈会'}
                      </Badge>
                      {item.type === 'onsite' 
                        ? getStatusBadge((item as OnsiteVisit).grantTask?.status || 'PENDING')
                        : getStatusBadge((item as MeetingGuest).tokenStatus)
                      }
                    </div>
                    
                    <h3 className="font-medium text-ink-black mb-1">{item.name}</h3>
                    
                    <div className="flex items-center gap-4 text-xs text-stone-gray">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {item.organization || '未知组织'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(item.sortDate).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {item.type === 'meeting' && (
                      <p className="text-xs text-stone-gray mt-1">
                        会议: {(item as MeetingGuest).meetingTitle}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gallery-gray rounded">
                        {GUEST_CATEGORY_LABELS[item.guestCategory as keyof typeof GUEST_CATEGORY_LABELS] || item.guestCategory}
                      </span>
                      {(item.type === 'onsite' 
                        ? (item as OnsiteVisit).grantTask?.status === 'APPROVED'
                        : (item as MeetingGuest).tokenStatus === 'APPROVED'
                      ) && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <Award size={12} />
                          +{item.type === 'onsite' 
                            ? (item as OnsiteVisit).grantTask?.amount 
                            : (item as MeetingGuest).tokenAmount
                          } Token
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </SimpleLayout>
  );
}



