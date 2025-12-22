/**
 * 预约详情页
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, Users, ChevronLeft, Utensils, X, Edit3, Calendar
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Avatar, Modal, Button } from '@/components/ui';
import { bookingsApi, BookingResponse } from '@/api/bookings';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // 检查是否有权操作（预约所有者或管理员）
  const canOperate = booking?.owner?.id === user?.id || user?.isAdmin;

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingsApi.getBooking(id!);
      setBooking(data);
    } catch (error) {
      console.error('加载预约详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      setCancelling(true);
      await bookingsApi.cancelBooking(id, { reason: cancelReason });
      setShowCancelModal(false);
      loadBooking();
    } catch (error) {
      console.error('取消预约失败:', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
      CONFIRMED: { label: '已确认', variant: 'primary' },
      CANCELLED: { label: '已取消', variant: 'secondary' },
      FINISHED: { label: '已结束', variant: 'success' },
    };
    const info = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="预约详情" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!booking) {
    return (
      <AppLayout showBottomNav={false} headerTitle="预约详情" showBack>
        <Empty description="未找到该预约" />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false} headerTitle="预约详情" showBack>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 标题卡片 */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-lg font-medium text-ink-black flex-1 pr-3">
              {booking.title}
            </h1>
            {getStatusBadge(booking.status)}
          </div>
          
          {booking.purpose && (
            <p className="text-sm text-stone-gray mb-4">{booking.purpose}</p>
          )}

          <div className="space-y-3">
            {/* 场地 */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-stone-gray mt-0.5" />
              <div>
                <p className="text-sm text-ink-black">{booking.venue?.name}</p>
                {booking.venue?.address && (
                  <p className="text-xs text-stone-gray">{booking.venue.address}</p>
                )}
              </div>
            </div>

            {/* 时间 */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-stone-gray mt-0.5" />
              <div>
                <p className="text-sm text-ink-black">
                  {format(new Date(booking.startTime), 'M月d日 EEEE', { locale: zhCN })}
                </p>
                <p className="text-xs text-stone-gray">
                  {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                </p>
              </div>
            </div>

            {/* 用餐 */}
            {booking.mealIncluded && (
              <div className="flex items-start gap-3">
                <Utensils className="w-4 h-4 text-stone-gray mt-0.5" />
                <div>
                  <p className="text-sm text-ink-black">包含用餐</p>
                  {booking.mealTypes && booking.mealTypes.length > 0 && (
                    <p className="text-xs text-stone-gray">
                      {booking.mealTypes.map(t => t === 'LUNCH' ? '午餐' : '晚餐').join('、')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 预约人 */}
        <Card className="p-5">
          <h3 className="text-sm font-medium text-ink-black mb-3">预约人</h3>
          <div className="flex items-center gap-3">
            <Avatar 
              src={booking.owner?.avatar} 
              name={booking.owner?.name || '未知'} 
              size="md" 
            />
            <div>
              <p className="text-sm font-medium text-ink-black">{booking.owner?.name}</p>
              <p className="text-xs text-stone-gray">{booking.owner?.title}</p>
            </div>
          </div>
        </Card>

        {/* 同行人员 */}
        {booking.companions && booking.companions.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-ink-black mb-3">
              同行人员 ({booking.companions.length})
            </h3>
            <div className="space-y-3">
              {booking.companions.map((companion: any) => (
                <div key={companion.id} className="flex items-center gap-3">
                  <Avatar 
                    src={companion.avatar} 
                    name={companion.name} 
                    size="sm" 
                  />
                  <div>
                    <p className="text-sm text-ink-black">{companion.name}</p>
                    <p className="text-xs text-stone-gray">{companion.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 备注 */}
        {booking.note && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-ink-black mb-2">备注</h3>
            <p className="text-sm text-stone-gray">{booking.note}</p>
          </Card>
        )}

        {/* 操作按钮 - 预约所有者或管理员可以修改/取消 */}
        {booking.status === 'CONFIRMED' && canOperate && (
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelModal(true)}
            >
              取消预约
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/bookings/${id}/edit`)}
            >
              修改预约
            </Button>
          </div>
        )}
      </motion.div>

      {/* 取消确认弹窗 */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="取消预约"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-gray">
            确定要取消这个预约吗？取消后无法恢复。
          </p>
          <textarea
            className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm resize-none focus:outline-none focus:border-ink-black"
            rows={3}
            placeholder="取消原因（选填）"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelModal(false)}
            >
              返回
            </Button>
            <Button
              className="flex-1"
              onClick={handleCancel}
              loading={cancelling}
            >
              确认取消
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

