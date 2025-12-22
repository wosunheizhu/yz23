/**
 * 会议详情页
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, Video, Lock, 
  UserPlus, Link as LinkIcon, ExternalLink
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Avatar, Modal, Button } from '@/components/ui';
import { meetingsApi, MeetingDetailResponse } from '@/api/meetings';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      const data = await meetingsApi.getMeeting(id!);
      setMeeting(data);
    } catch (error) {
      console.error('加载会议详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      setCancelling(true);
      await meetingsApi.cancelMeeting(id);
      setShowCancelModal(false);
      loadMeeting();
    } catch (error) {
      console.error('取消会议失败:', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'success' | 'gold' | 'outline' }> = {
      SCHEDULED: { label: '已安排', variant: 'gold' },
      FINISHED: { label: '已结束', variant: 'success' },
      CANCELLED: { label: '已取消', variant: 'outline' },
    };
    const info = statusMap[status] || { label: status, variant: 'default' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getConfidentialityBadge = (level: string) => {
    const map: Record<string, string> = {
      LOW: '普通',
      MEDIUM: '内部',
      HIGH: '机密',
    };
    if (level === 'HIGH') {
      return (
        <Badge variant="error" size="sm">
          <Lock className="w-3 h-3 mr-1" />
          {map[level]}
        </Badge>
      );
    }
    return null;
  };

  const getAttendanceStatus = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      INVITED: { label: '已邀请', color: 'text-stone-gray' },
      ATTENDING: { label: '参加', color: 'text-green-600' },
      DECLINED: { label: '婉拒', color: 'text-red-500' },
      NO_SHOW: { label: '未出席', color: 'text-stone-gray' },
    };
    const info = map[status] || { label: status, color: 'text-stone-gray' };
    return <span className={`text-xs ${info.color}`}>{info.label}</span>;
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} header={{ title: '会议详情', showBack: true }}>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout showBottomNav={false} header={{ title: '会议详情', showBack: true }}>
        <Empty description="未找到该会议" />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBottomNav={false} header={{ title: '会议详情', showBack: true }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 标题卡片 */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-lg font-medium text-ink-black flex-1 pr-3">
              {meeting.topic}
            </h1>
            {getStatusBadge(meeting.status)}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={meeting.meetingKind === 'COMPANY' ? 'gold' : 'default'} size="sm">
              {meeting.meetingKind === 'COMPANY' ? '公司座谈会' : '日常会议'}
            </Badge>
            {meeting.meetingLevel === 'EXTERNAL' && (
              <Badge variant="outline" size="sm">外部</Badge>
            )}
            {getConfidentialityBadge(meeting.confidentiality)}
          </div>

          <div className="space-y-3">
            {/* 日期 */}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-stone-gray mt-0.5" />
              <div>
                <p className="text-sm text-ink-black">
                  {format(new Date(meeting.startTime), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                </p>
              </div>
            </div>

            {/* 时间 */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-stone-gray mt-0.5" />
              <div>
                <p className="text-sm text-ink-black">
                  {format(new Date(meeting.startTime), 'HH:mm')} - {format(new Date(meeting.endTime), 'HH:mm')}
                </p>
              </div>
            </div>

            {/* 地点 */}
            <div className="flex items-start gap-3">
              {meeting.isOffline ? (
                <>
                  <MapPin className="w-4 h-4 text-stone-gray mt-0.5" />
                  <div>
                    <p className="text-sm text-ink-black">
                      {meeting.venue?.name || meeting.location || '待定'}
                    </p>
                    {meeting.venue?.address && (
                      <p className="text-xs text-stone-gray">{meeting.venue.address}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 text-stone-gray mt-0.5" />
                  <div>
                    <p className="text-sm text-ink-black">线上会议</p>
                    {meeting.onlineLink && (
                      <a 
                        href={meeting.onlineLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center gap-1 mt-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        会议链接
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 关联项目 */}
        {meeting.project && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-ink-black mb-2">关联项目</h3>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate(`/projects/${meeting.project?.id}`)}
            >
              <span className="text-sm text-stone-gray">{meeting.project.name}</span>
              <ExternalLink className="w-3 h-3 text-stone-gray" />
            </div>
          </Card>
        )}

        {/* 会议人员 - 统一管理入口 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-ink-black">
              会议人员
            </h3>
            {meeting.status === 'SCHEDULED' && (
              <button 
                className="text-xs text-champagne-gold flex items-center gap-1"
                onClick={() => navigate(`/meetings/${id}/members`)}
              >
                <UserPlus className="w-3 h-3" />
                添加/管理
              </button>
            )}
          </div>

          {/* 内部参与者 */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-stone-gray mb-2">内部参与者 ({meeting.participants.length})</p>
              <div className="space-y-2">
                {meeting.participants.map((participant: any) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={participant.user?.avatar} 
                        name={participant.user?.name || '未知'} 
                        size="sm" 
                      />
                      <div>
                        <p className="text-sm text-ink-black">{participant.user?.name}</p>
                        <p className="text-xs text-stone-gray">
                          {participant.role === 'HOST' ? '主持人' : '参与者'}
                        </p>
                      </div>
                    </div>
                    {getAttendanceStatus(participant.attendanceStatus)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 外部嘉宾 */}
          {meeting.guests && meeting.guests.length > 0 && (
            <div>
              <p className="text-xs text-stone-gray mb-2">外部嘉宾 ({meeting.guests.length})</p>
              <div className="space-y-2">
                {meeting.guests.map((guest) => (
                  <div key={guest.id} className="flex items-center gap-3">
                    <Avatar name={guest.name} size="sm" />
                    <div>
                      <p className="text-sm text-ink-black">{guest.name}</p>
                      <p className="text-xs text-stone-gray">
                        {guest.organization} · {guest.title}
                      </p>
                      {guest.invitedBy && (
                        <p className="text-xs text-champagne-gold">
                          邀请人: {guest.invitedBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {(!meeting.participants || meeting.participants.length === 0) && 
           (!meeting.guests || meeting.guests.length === 0) && (
            <p className="text-sm text-stone-gray text-center py-4">
              暂无参与人员，点击上方添加
            </p>
          )}
        </Card>

        {/* 操作按钮 */}
        {meeting.status === 'SCHEDULED' && (
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCancelModal(true)}
            >
              取消会议
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/meetings/${id}/edit`)}
            >
              编辑会议
            </Button>
          </div>
        )}
      </motion.div>

      {/* 取消确认弹窗 */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="取消会议"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-gray">
            确定要取消这个会议吗？所有参与者将收到通知。
          </p>
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
