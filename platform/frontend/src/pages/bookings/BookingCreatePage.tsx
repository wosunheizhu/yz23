/**
 * 创建场地预约页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Modal, Input } from '../../components/ui';
import { createBooking, CreateBookingInput } from '../../api/bookings';
import { listVenues, createVenue, VenueResponse } from '../../api/venues';

export default function BookingCreatePage() {
  const navigate = useNavigate();
  
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [formData, setFormData] = useState({
    venueId: '',
    title: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 新增场地弹窗
  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [addingVenue, setAddingVenue] = useState(false);
  
  // 过滤掉旧的上海会议室
  const filteredVenues = venues.filter(v => !v.name.includes('上海会议室'));

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoadingVenues(true);
      const result = await listVenues({ pageSize: 100, status: 'ACTIVE' });
      setVenues(result.data || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleAddVenue = async () => {
    if (!newVenueName.trim()) {
      return;
    }
    
    try {
      setAddingVenue(true);
      const newVenue = await createVenue({
        name: newVenueName.trim(),
        address: newVenueAddress.trim() || undefined,
      });
      
      // 添加到列表并选中
      setVenues([...venues, newVenue]);
      handleChange('venueId', newVenue.id);
      
      // 重置表单并关闭弹窗
      setNewVenueName('');
      setNewVenueAddress('');
      setShowAddVenueModal(false);
    } catch (err: any) {
      console.error('新增场地失败:', err);
      alert(err.response?.data?.error?.message || '新增场地失败');
    } finally {
      setAddingVenue(false);
    }
  };

  const handleSubmit = async () => {
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
      
      // 转换时间格式为 ISO 字符串
      const bookingData: CreateBookingInput = {
        venueId: formData.venueId,
        title: formData.title || '场地预约',
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        purpose: formData.purpose || undefined,
      };
      
      await createBooking(bookingData);
      navigate('/bookings', { replace: true, state: { message: '预约成功' } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '预约失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingVenues) {
    return (
      <SimpleLayout title="预约场地">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="预约场地">
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

        {/* 选择场地 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            选择场地 <span className="text-error">*</span>
          </label>
          <div className="space-y-sm">
            {filteredVenues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => handleChange('venueId', venue.id)}
                className={`w-full p-md text-left rounded-gallery border transition-colors ${
                  formData.venueId === venue.id
                    ? 'border-champagne-gold bg-champagne-gold/5'
                    : 'border-silk-gray'
                }`}
              >
                <div className="flex items-center gap-md">
                  <MapPin size={18} className={formData.venueId === venue.id ? 'text-champagne-gold' : 'text-stone-gray'} />
                  <p className={`text-body ${formData.venueId === venue.id ? 'text-deep-black' : 'text-stone-gray'}`}>
                    {venue.name}
                  </p>
                </div>
              </button>
            ))}
            
            {/* 新增场地按钮 */}
            <button
              onClick={() => setShowAddVenueModal(true)}
              className="w-full p-md text-left rounded-gallery border border-dashed border-stone-gray hover:border-champagne-gold transition-colors"
            >
              <div className="flex items-center gap-md">
                <Plus size={18} className="text-stone-gray" />
                <p className="text-body text-stone-gray">新增场地</p>
              </div>
            </button>
          </div>
        </div>

        {/* 预约标题 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            预约标题
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入预约标题"
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 开始时间 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            开始时间 <span className="text-error">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 结束时间 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            结束时间 <span className="text-error">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => handleChange('endTime', e.target.value)}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 用途说明 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            用途说明
          </label>
          <textarea
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            placeholder="请简要说明预约用途"
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
          {submitting ? '提交中...' : '提交预约'}
        </Button>
      </motion.div>

      {/* 新增场地弹窗 */}
      <Modal
        isOpen={showAddVenueModal}
        onClose={() => setShowAddVenueModal(false)}
        title="新增场地"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              场地名称 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={newVenueName}
              onChange={(e) => setNewVenueName(e.target.value)}
              placeholder="请输入场地名称"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              场地地址
            </label>
            <input
              type="text"
              value={newVenueAddress}
              onChange={(e) => setNewVenueAddress(e.target.value)}
              placeholder="请输入场地地址"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddVenueModal(false)}
            >
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddVenue}
              disabled={addingVenue || !newVenueName.trim()}
            >
              {addingVenue ? '添加中...' : '确认添加'}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}

