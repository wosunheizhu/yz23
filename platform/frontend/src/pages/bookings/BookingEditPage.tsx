/**
 * 编辑预约页面
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading } from '../../components/ui';
import { bookingsApi, BookingResponse } from '../../api/bookings';
import { listVenues, VenueResponse } from '../../api/venues';

export default function BookingEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    venueId: '',
    startTime: '',
    endTime: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [bookingData, venuesData] = await Promise.all([
        bookingsApi.getBooking(id),
        listVenues({ status: 'ACTIVE' }),
      ]);
      setBooking(bookingData);
      setVenues(venuesData.data || []);
      
      // 初始化表单数据
      if (bookingData) {
        setFormData({
          title: bookingData.title || '',
          venueId: bookingData.venue?.id || '',
          startTime: bookingData.startTime ? new Date(bookingData.startTime).toISOString().slice(0, 16) : '',
          endTime: bookingData.endTime ? new Date(bookingData.endTime).toISOString().slice(0, 16) : '',
          note: bookingData.note || '',
        });
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!id) return;

    if (!formData.title.trim()) {
      setError('请输入预约标题');
      return;
    }
    if (!formData.venueId) {
      setError('请选择场地');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('请选择时间');
      return;
    }
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 构建更新数据
      const updateData: any = {
        title: formData.title,
        venueId: formData.venueId, // 始终发送场地ID
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      };
      
      // 添加备注（如果有）
      if (formData.note) {
        updateData.note = formData.note;
      }
      
      await bookingsApi.updateBooking(id, updateData);
      navigate(`/bookings/${id}`, { replace: true, state: { message: '预约已更新' } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '更新失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout title="修改预约">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!booking) {
    return (
      <SimpleLayout title="修改预约">
        <div className="flex items-center justify-center h-64">
          <p className="text-stone-gray">预约不存在</p>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="修改预约">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 错误提示 */}
        {error && (
          <Card className="p-md bg-error/10 border-error/30">
            <div className="flex items-center gap-sm text-error">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </Card>
        )}

        {/* 预约标题 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            预约标题 <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入预约标题"
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 选择场地 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            选择场地 <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3">
            {venues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => handleChange('venueId', venue.id)}
                className={`w-full p-4 text-left rounded-gallery border transition-colors ${
                  formData.venueId === venue.id
                    ? 'border-champagne-gold bg-champagne-gold/5'
                    : 'border-silk-gray hover:border-stone-gray'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={18} className={formData.venueId === venue.id ? 'text-champagne-gold' : 'text-stone-gray'} />
                  <div>
                    <p className="font-medium text-deep-black">{venue.name}</p>
                    <p className="text-xs text-stone-gray">{venue.address}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 开始时间 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            开始时间 <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray" />
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 结束时间 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            结束时间 <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-gray" />
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            备注（选填）
          </label>
          <textarea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="其他需要说明的信息..."
            rows={3}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '保存中...' : '保存修改'}
        </Button>
      </motion.div>
    </SimpleLayout>
  );
}

