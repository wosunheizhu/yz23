/**
 * 发现页面
 * 整合社群、人脉资源等入口
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Users,
  MessageCircle,
  Briefcase,
  Calendar,
  Building,
  TrendingUp,
  ChevronRight,
  Bell,
  Newspaper,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Badge } from '../../components/ui';
import { announcementsApi, AnnouncementResponse } from '../../api/announcements';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 快捷入口配置
const quickLinks = [
  { id: 'record', icon: ClipboardList, label: '记录', path: '/onsite-visits/create', color: 'text-info' },
  { id: 'community', icon: MessageCircle, label: '社群', path: '/community', color: 'text-success' },
  { id: 'projects', icon: Briefcase, label: '项目', path: '/projects', color: 'text-warning' },
  { id: 'resources', icon: Users, label: '人脉', path: '/network-resources', color: 'text-rose-gold' },
  { id: 'meetings', icon: Calendar, label: '座谈会', path: '/meetings', color: 'text-champagne-gold' },
  { id: 'bookings', icon: Building, label: '预约', path: '/bookings', color: 'text-copper' },
  { id: 'announcements', icon: Bell, label: '公告', path: '/announcements', color: 'text-error' },
  { id: 'feedback', icon: TrendingUp, label: '反馈', path: '/feedback', color: 'text-stone-gray' },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [latestAnnouncements, setLatestAnnouncements] = useState<AnnouncementResponse[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await announcementsApi.listAnnouncements({ page: 1, pageSize: 2 });
      const announcementData = result.data;
      setLatestAnnouncements(announcementData?.items || announcementData?.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout
      header={{ title: '发现', showLogo: true }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 快捷入口 */}
        <motion.section variants={itemVariants}>
          <div className="grid grid-cols-4 gap-md">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-sm py-md hover:bg-gallery-gray rounded-gallery transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gallery-gray flex items-center justify-center">
                    <Icon size={22} className={link.color} />
                  </div>
                  <span className="text-tiny text-charcoal">{link.label}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* 最新公告 */}
        {latestAnnouncements.length > 0 && (
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-md">
              <h3 className="section-title">最新公告</h3>
              <button
                onClick={() => navigate('/announcements')}
                className="text-caption text-stone-gray hover:text-champagne-gold transition-colors flex items-center gap-xs"
              >
                更多 <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-sm">
              {latestAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  interactive
                  onClick={() => navigate('/announcements')}
                  className="p-md"
                >
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                      <Bell size={18} className="text-error" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-deep-black line-clamp-1">{announcement.title}</p>
                      <p className="text-tiny text-stone-gray">{formatDate(announcement.publishedAt || announcement.createdAt)}</p>
                    </div>
                    {announcement.isPinned && (
                      <Badge size="sm" variant="new">置顶</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {/* 功能卡片 */}
        <motion.section variants={itemVariants}>
          <h3 className="section-title mb-md">探索更多</h3>
          
          <div className="grid grid-cols-2 gap-md">
            <Card
              interactive
              onClick={() => navigate('/partners')}
              className="p-lg"
            >
              <Users size={24} className="text-champagne-gold mb-md" strokeWidth={1} />
              <p className="text-body text-deep-black font-medium">合伙人名录</p>
              <p className="text-tiny text-stone-gray mt-xs">查看所有合伙人</p>
            </Card>

            <Card
              interactive
              onClick={() => navigate('/calendar')}
              className="p-lg"
            >
              <Calendar size={24} className="text-champagne-gold mb-md" strokeWidth={1} />
              <p className="text-body text-deep-black font-medium">我的日历</p>
              <p className="text-tiny text-stone-gray mt-xs">查看日程安排</p>
            </Card>

            <Card
              interactive
              onClick={() => navigate('/token')}
              className="p-lg"
            >
              <TrendingUp size={24} className="text-champagne-gold mb-md" strokeWidth={1} />
              <p className="text-body text-deep-black font-medium">Token 账户</p>
              <p className="text-tiny text-stone-gray mt-xs">查看余额和交易</p>
            </Card>

            <Card
              interactive
              onClick={() => navigate('/demands')}
              className="p-lg"
            >
              <Newspaper size={24} className="text-champagne-gold mb-md" strokeWidth={1} />
              <p className="text-body text-deep-black font-medium">需求大厅</p>
              <p className="text-tiny text-stone-gray mt-xs">浏览所有需求</p>
            </Card>
          </div>
        </motion.section>
      </motion.div>
    </AppLayout>
  );
}
