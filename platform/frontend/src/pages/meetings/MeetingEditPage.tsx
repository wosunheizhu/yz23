/**
 * 编辑会议页
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Video, Users, Link as LinkIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Input, Button, Loading, Empty } from '@/components/ui';
import { 
  meetingsApi, 
  UpdateMeetingInput, 
  MeetingKind, 
  MeetingLevel, 
  ConfidentialityLevel,
  MeetingDetailResponse 
} from '@/api/meetings';
import { venuesApi, VenueResponse } from '@/api/venues';
import { projectsApi } from '@/api/projects';
import { format } from 'date-fns';

export default function MeetingEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null);
  
  const [formData, setFormData] = useState<{
    topic: string;
    meetingKind: MeetingKind;
    meetingLevel: MeetingLevel;
    confidentiality: ConfidentialityLevel;
    isOffline: boolean;
    startTime: string;
    endTime: string;
    venueId?: string;
    location?: string;
    onlineLink?: string;
    projectId?: string;
  }>({
    topic: '',
    meetingKind: 'DAILY',
    meetingLevel: 'INTERNAL',
    confidentiality: 'LOW',
    isOffline: true,
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingData, venuesData, projectsData] = await Promise.all([
        meetingsApi.getMeeting(id!),
        venuesApi.list({ status: 'ACTIVE' }),
        projectsApi.list({ pageSize: 50 }),
      ]);
      
      setMeeting(meetingData);
      setVenues(venuesData.data || []);
      setProjects(projectsData?.data || []);
      
      // 初始化表单数据
      setFormData({
        topic: meetingData.topic,
        meetingKind: meetingData.meetingKind as MeetingKind,
        meetingLevel: meetingData.meetingLevel as MeetingLevel,
        confidentiality: meetingData.confidentiality as ConfidentialityLevel,
        isOffline: meetingData.isOffline,
        startTime: format(new Date(meetingData.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(meetingData.endTime), "yyyy-MM-dd'T'HH:mm"),
        venueId: meetingData.venue?.id,
        location: meetingData.location || '',
        onlineLink: meetingData.onlineLink || '',
        projectId: meetingData.project?.id,
      });
    } catch (error) {
      console.error('加载会议详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.topic.trim()) {
      alert('请输入会议主题');
      return;
    }

    try {
      setSaving(true);
      
      const updateData: UpdateMeetingInput = {
        topic: formData.topic,
        meetingLevel: formData.meetingLevel,
        confidentiality: formData.confidentiality,
        isOffline: formData.isOffline,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        venueId: formData.isOffline && formData.venueId ? formData.venueId : null,
        location: formData.isOffline ? (formData.location || null) : null,
        onlineLink: !formData.isOffline ? (formData.onlineLink || null) : null,
        projectId: formData.projectId || null,
      };
      
      await meetingsApi.updateMeeting(id!, updateData);
      navigate(`/meetings/${id}`);
    } catch (error) {
      console.error('更新会议失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="编辑会议" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout showBottomNav={false} headerTitle="编辑会议" showBack>
        <Empty description="未找到该会议" />
      </AppLayout>
    );
  }

  // 已结束或已取消的会议不可编辑
  if (meeting.status !== 'SCHEDULED') {
    return (
      <AppLayout showBottomNav={false} headerTitle="编辑会议" showBack>
        <div className="p-4">
          <Card className="p-6 text-center">
            <p className="text-stone-gray mb-4">
              该会议已{meeting.status === 'FINISHED' ? '结束' : '取消'}，无法编辑
            </p>
            <Button variant="outline" onClick={() => navigate(`/meetings/${id}`)}>
              返回会议详情
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false} headerTitle="编辑会议" showBack>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 基本信息 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">基本信息</h3>
          
          <Input
            label="会议主题"
            placeholder="请输入会议主题"
            value={formData.topic}
            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stone-gray mb-1.5">会议类型</label>
              <select
                className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black bg-gallery-gray"
                value={formData.meetingKind}
                disabled
              >
                <option value="DAILY">日常会议</option>
                <option value="COMPANY">公司座谈会</option>
              </select>
              <p className="text-xs text-stone-gray mt-1">会议类型不可修改</p>
            </div>
            <div>
              <label className="block text-sm text-stone-gray mb-1.5">会议级别</label>
              <select
                className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
                value={formData.meetingLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, meetingLevel: e.target.value as MeetingLevel }))}
              >
                <option value="INTERNAL">内部</option>
                <option value="EXTERNAL">外部</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-stone-gray mb-1.5">保密级别</label>
            <select
              className="w-full px-3 py-2 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black"
              value={formData.confidentiality}
              onChange={(e) => setFormData(prev => ({ ...prev, confidentiality: e.target.value as ConfidentialityLevel }))}
            >
              <option value="LOW">普通</option>
              <option value="MEDIUM">内部</option>
              <option value="HIGH">机密</option>
            </select>
          </div>
        </Card>

        {/* 时间 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">会议时间</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="开始时间"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            />
            <Input
              label="结束时间"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
        </Card>

        {/* 地点 */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-ink-black">会议地点</h3>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingMode"
                checked={formData.isOffline}
                onChange={() => setFormData(prev => ({ ...prev, isOffline: true }))}
                className="w-4 h-4 accent-ink-black"
              />
              <span className="text-sm text-ink-black">线下</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="meetingMode"
                checked={!formData.isOffline}
                onChange={() => setFormData(prev => ({ ...prev, isOffline: false }))}
                className="w-4 h-4 accent-ink-black"
              />
              <span className="text-sm text-ink-black">线上</span>
            </label>
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
              <Input
                label="具体地点"
                placeholder="或手动输入地点"
                value={formData.location || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </>
          ) : (
            <Input
              label="会议链接"
              placeholder="请输入线上会议链接"
              value={formData.onlineLink || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, onlineLink: e.target.value }))}
            />
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
        <div className="pt-4 pb-8 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/meetings/${id}`)}
          >
            取消
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            loading={saving}
            disabled={!formData.topic.trim()}
          >
            保存修改
          </Button>
        </div>
      </motion.div>
    </AppLayout>
  );
}

