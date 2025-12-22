/**
 * 场地预约列表页面
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Tabs } from '../../components/ui';
import { listBookings, Booking, BOOKING_STATUS_LABELS } from '../../api/bookings';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// 状态颜色映射
const statusColors: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  CONFIRMED: 'bg-success/10 text-success',
  COMPLETED: 'bg-gallery-gray text-stone-gray',
  CANCELLED: 'bg-error/10 text-error',
};

export default function BookingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const result = await listBookings({
        page: 1,
        pageSize: 50,
        from: activeTab === 'upcoming' ? now.toISOString() : undefined,
        to: activeTab === 'past' ? now.toISOString() : undefined,
      });
      
      // 客户端筛选
      const filtered = (result.data || []).filter((b) => {
        const isUpcoming = new Date(b.startTime) >= now;
        return activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
      });
      
      setBookings(filtered);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'upcoming', label: '即将进行' },
    { id: 'past', label: '已结束' },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <AppLayout header={{ title: '场地预约', showBack: true }}>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout header={{ title: '场地预约', showBack: true }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-lg"
      >
        {/* 分类标签 */}
        <motion.div variants={itemVariants}>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'upcoming' | 'past')}
          />
        </motion.div>

        {/* 新建按钮 */}
        <motion.div variants={itemVariants} className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/bookings/create')}
          >
            <Plus size={16} className="mr-1" />
            预约场地
          </Button>
        </motion.div>

        {/* 预约列表 */}
        {bookings.length === 0 ? (
          <Empty
            description={activeTab === 'upcoming' ? '暂无即将进行的预约' : '暂无已结束的预约'}
          />
        ) : (
          <div className="space-y-md">
            {bookings.map((booking) => (
              <motion.div key={booking.id} variants={itemVariants}>
                <Card
                  interactive
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                  className="p-lg"
                >
                  <div className="flex items-start justify-between mb-md">
                    <div>
                      <h4 className="text-body text-deep-black font-medium mb-xs">
                        {booking.title || '场地预约'}
                      </h4>
                      <Badge size="sm" className={statusColors[booking.status]}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </div>
                    <ChevronRight size={16} className="text-stone-gray" />
                  </div>

                  <div className="space-y-sm text-sm text-stone-gray">
                    <div className="flex items-center gap-sm">
                      <Calendar size={14} />
                      <span>{formatDate(booking.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <Clock size={14} />
                      <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
                    </div>
                    {booking.venueName && (
                      <div className="flex items-center gap-sm">
                        <MapPin size={14} />
                        <span>{booking.venueName}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

