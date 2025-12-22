/**
 * 线下到访记录创建页面
 * 用户记录邀请到公司线下的人员
 * 可作为业绩申请Token奖励
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, Input, Button } from '@/components/ui';
import { 
  onsiteVisitsApi, 
  CreateOnsiteVisitInput, 
  GuestCategory, 
  GUEST_CATEGORY_LABELS,
} from '@/api/onsite-visits';
import { venuesApi, VenueResponse } from '@/api/venues';
import { format } from 'date-fns';
import { User, Building, Briefcase, Phone, Calendar, MapPin, Award, FileText } from 'lucide-react';

export default function OnsiteVisitCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [venues, setVenues] = useState<VenueResponse[]>([]);

  const [formData, setFormData] = useState<CreateOnsiteVisitInput>({
    name: '',
    organization: '',
    title: '',
    contact: '',
    purpose: '',
    note: '',
    visitDate: format(new Date(), "yyyy-MM-dd"),
    guestCategory: 'OTHER',
    venueId: '',
  });

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const response = await venuesApi.list({ status: 'ACTIVE' });
      setVenues(response.data || []);
    } catch (error) {
      console.error('加载场地失败:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.organization.trim() || !formData.title.trim()) {
      alert('请填写访客姓名、所属组织和职位');
      return;
    }

    try {
      setSubmitting(true);
      await onsiteVisitsApi.create({
        ...formData,
        visitDate: new Date(formData.visitDate).toISOString(),
        venueId: formData.venueId || undefined,
        contact: formData.contact || undefined,
        purpose: formData.purpose || undefined,
        note: formData.note || undefined,
      });

      // 成功后显示提示并返回
      alert('线下到访记录已创建，Token发放任务已生成待审核');
      navigate(-1);
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout showBottomNav={false} header={{ title: '记录线下到访', showBack: true }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 说明卡片 */}
        <Card className="p-4 bg-gradient-to-br from-champagne-gold/10 to-champagne-gold/5 border-champagne-gold/20">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-champagne-gold mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-ink-black mb-1">记录您邀请的线下访客</h3>
              <p className="text-xs text-stone-gray">
                记录邀请到公司线下的人员，可作为业绩申请Token奖励。创建后将生成Token发放任务，由管理员审核后发放。
              </p>
            </div>
          </div>
        </Card>

        {/* 访客信息 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black flex items-center gap-2">
            <User size={16} />
            访客信息
          </h3>

          <Input
            label="访客姓名"
            placeholder="请输入访客姓名"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="所属组织"
            placeholder="请输入访客所属组织/公司"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
            required
          />

          <Input
            label="职位"
            placeholder="请输入访客职位"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />

          <Input
            label="联系方式"
            placeholder="电话/微信（可选）"
            value={formData.contact || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
          />
        </Card>

        {/* 访客分类 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black flex items-center gap-2">
            <Briefcase size={16} />
            访客类别
          </h3>

          <div>
            <label className="block text-sm text-stone-gray mb-2">
              选择访客类别
            </label>
            <select
              className="w-full px-3 py-2.5 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black transition-colors"
              value={formData.guestCategory}
              onChange={(e) => setFormData(prev => ({ ...prev, guestCategory: e.target.value as GuestCategory }))}
            >
              {Object.entries(GUEST_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-stone-gray">
            记录提交后将生成Token发放任务，由管理员审核决定奖励金额
          </p>
        </Card>

        {/* 到访信息 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black flex items-center gap-2">
            <Calendar size={16} />
            到访信息
          </h3>

          <Input
            label="到访日期"
            type="date"
            value={formData.visitDate}
            onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm text-stone-gray mb-1.5 flex items-center gap-1">
              <MapPin size={14} />
              到访场地（可选）
            </label>
            <select
              className="w-full px-3 py-2.5 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black transition-colors"
              value={formData.venueId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, venueId: e.target.value }))}
            >
              <option value="">选择场地</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* 备注信息 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black flex items-center gap-2">
            <FileText size={16} />
            其他信息
          </h3>

          <div>
            <label className="block text-sm text-stone-gray mb-1.5">到访目的</label>
            <textarea
              className="w-full px-3 py-2.5 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black transition-colors resize-none"
              rows={2}
              placeholder="请简述到访目的（可选）"
              value={formData.purpose || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-stone-gray mb-1.5">备注</label>
            <textarea
              className="w-full px-3 py-2.5 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black transition-colors resize-none"
              rows={2}
              placeholder="其他补充信息（可选）"
              value={formData.note || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
            />
          </div>
        </Card>

        {/* 提交按钮 */}
        <div className="pt-4 pb-8">
          <Button
            className="w-full"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!formData.name.trim() || !formData.organization.trim() || !formData.title.trim()}
          >
            提交记录
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}

