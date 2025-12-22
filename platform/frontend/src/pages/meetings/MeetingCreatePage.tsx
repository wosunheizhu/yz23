/**
 * 创建会议页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Users, Link as LinkIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Input, Button, Loading } from '@/components/ui';
import { meetingsApi, CreateMeetingInput, MeetingKind } from '@/api/meetings';
import { venuesApi, VenueResponse } from '@/api/venues';
import { projectsApi } from '@/api/projects';
import { format, addHours } from 'date-fns';

export default function MeetingCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<CreateMeetingInput>({
    topic: '',
    meetingKind: 'DAILY' as MeetingKind,
    isOffline: true,
    startTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:00"),
    endTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:00"),
  });

  useEffect(() => {
    loadVenues();
    loadProjects();
  }, []);

  const loadVenues = async () => {
    try {
      const response = await venuesApi.list({ status: 'ACTIVE' });
      setVenues(response.data || []);
    } catch (error) {
      console.error('加载场地失败:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list({ pageSize: 50 });
      if (response && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    }
  };

  const handleSubmit = async () => {
    // 验证必填字段
    if (!formData.topic.trim()) {
      alert('请输入会议主题');
      return;
    }
    
    if (!formData.startTime || !formData.endTime) {
      alert('请选择会议时间');
      return;
    }
    
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      alert('结束时间必须晚于开始时间');
      return;
    }
    
    // 线下会议必须有场地或地点
    if (formData.isOffline && !formData.venueId && !formData.location?.trim()) {
      alert('线下会议请选择场地或填写具体地点');
      return;
    }

    try {
      setLoading(true);
      const meeting = await meetingsApi.createMeeting({
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      });
      
      if (meeting && meeting.id) {
        navigate(`/meetings/${meeting.id}`);
      }
    } catch (error: any) {
      console.error('创建会议失败:', error);
      // 后端返回格式: { success: false, error: { code, message } }
      const message = error.response?.data?.error?.message || error.response?.data?.message || '创建失败，请重试';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout showBottomNav={false} headerTitle="创建会议" showBack>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">基本信息</h3>
          
          <div>
            <label className="block text-sm text-stone-gray mb-1.5">
              会议主题 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入会议主题"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-stone-gray mb-1.5">
              会议类型 <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
              value={formData.meetingKind}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingKind: e.target.value as MeetingKind }))}
            >
              <option value="DAILY">日常会议</option>
              <option value="COMPANY">公司座谈会</option>
            </select>
          </div>
        </Card>

        {/* 时间 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">会议时间</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-gray mb-1.5">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-stone-gray mb-1.5">
                结束时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* 地点 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">
            会议地点 <span className="text-red-500">*</span>
          </h3>

          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isOffline: true, onlineLink: undefined }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                formData.isOffline 
                  ? 'border-champagne-gold bg-champagne-gold/10 text-champagne-gold' 
                  : 'border-mist-gray text-stone-gray hover:border-ink-black'
              }`}
            >
              <MapPin size={16} />
              <span className="text-sm">线下</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isOffline: false, venueId: undefined, location: undefined }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                !formData.isOffline 
                  ? 'border-champagne-gold bg-champagne-gold/10 text-champagne-gold' 
                  : 'border-mist-gray text-stone-gray hover:border-ink-black'
              }`}
            >
              <Video size={16} />
              <span className="text-sm">线上</span>
            </button>
          </div>

          {formData.isOffline ? (
            <>
              <div>
                <label className="block text-sm text-stone-gray mb-1.5">选择场地</label>
                <select
                  className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
                  value={formData.venueId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, venueId: e.target.value || undefined }))}
                >
                  <option value="">选择场地（可选）</option>
                  {venues.map(venue => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-gray mb-1.5">
                  具体地点 {!formData.venueId && <span className="text-red-500">*</span>}
                </label>
                <Input
                  placeholder="请输入会议地点"
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
                {!formData.venueId && !formData.location && (
                  <p className="text-xs text-stone-gray mt-1">线下会议需选择场地或填写具体地点</p>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm text-stone-gray mb-1.5">会议链接</label>
              <Input
                placeholder="请输入线上会议链接（可选）"
                value={formData.onlineLink || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, onlineLink: e.target.value }))}
              />
            </div>
          )}
        </Card>

        {/* 关联项目 */}
        <Card className="p-4">
          <label className="block text-sm text-stone-gray mb-1.5">关联项目</label>
          <select
            className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
            value={formData.projectId || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value || undefined }))}
          >
            <option value="">选择项目（可选）</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </Card>

        {/* 提交按钮 */}
        <div className="pt-4 pb-8">
          <Button
            className="w-full"
            onClick={handleSubmit}
            loading={loading}
            disabled={
              !formData.topic.trim() || 
              !formData.startTime || 
              !formData.endTime ||
              (formData.isOffline && !formData.venueId && !formData.location?.trim())
            }
          >
            创建会议
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}
