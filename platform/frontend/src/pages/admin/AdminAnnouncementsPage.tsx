/**
 * 管理员 - 公告管理页面
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Pin, PinOff, Eye, EyeOff } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Badge, Button, Loading, Empty, Modal } from '../../components/ui';
import { announcementsApi, AnnouncementResponse } from '../../api/announcements';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gallery-gray text-stone-gray',
  PUBLISHED: 'bg-success/10 text-success',
  ARCHIVED: 'bg-stone-gray/10 text-stone-gray',
};

export default function AdminAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementResponse[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementResponse | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementsApi.list({ pageSize: 50 });
      setAnnouncements(response.data || []);
    } catch (err) {
      console.error('加载公告失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写完整信息');
      return;
    }
    try {
      setSaving(true);
      await announcementsApi.create({
        title: formData.title,
        content: formData.content,
        isPinned: formData.isPinned,
      });
      setShowCreateModal(false);
      setFormData({ title: '', content: '', isPinned: false });
      loadAnnouncements();
    } catch (err) {
      console.error('创建公告失败:', err);
      alert('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement || !formData.title.trim() || !formData.content.trim()) {
      alert('请填写完整信息');
      return;
    }
    try {
      setSaving(true);
      await announcementsApi.update(editingAnnouncement.id, {
        title: formData.title,
        content: formData.content,
        isPinned: formData.isPinned,
      });
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', isPinned: false });
      loadAnnouncements();
    } catch (err) {
      console.error('更新公告失败:', err);
      alert('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      await announcementsApi.delete(id);
      loadAnnouncements();
    } catch (err) {
      console.error('删除公告失败:', err);
      alert('删除失败');
    }
  };

  const handleTogglePin = async (announcement: AnnouncementResponse) => {
    try {
      await announcementsApi.update(announcement.id, {
        isPinned: !announcement.isPinned,
      });
      loadAnnouncements();
    } catch (err) {
      console.error('更新公告失败:', err);
      alert('操作失败');
    }
  };

  const openEditModal = (announcement: AnnouncementResponse) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned || false,
    });
    setEditingAnnouncement(announcement);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', isPinned: false });
  };

  return (
    <SimpleLayout title="公告管理" showBack backPath="/admin">
      <div className="px-lg py-lg space-y-lg">
        {/* 新增公告按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} className="mr-2" />
          发布新公告
        </Button>

        {/* 公告列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : announcements.length === 0 ? (
          <Empty description="暂无公告" />
        ) : (
          <div className="space-y-md">
            {announcements.map((announcement) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-lg">
                  <div className="flex items-start justify-between mb-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.isPinned && (
                          <Pin size={14} className="text-champagne-gold" />
                        )}
                        <h4 className="font-medium text-deep-black">{announcement.title}</h4>
                      </div>
                      <p className="text-sm text-stone-gray line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge size="sm" className={STATUS_COLORS[announcement.status] || 'bg-gallery-gray text-stone-gray'}>
                          {STATUS_LABELS[announcement.status] || announcement.status}
                        </Badge>
                        <span className="text-xs text-stone-gray">
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-md border-t border-silk-gray">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(announcement)}
                    >
                      {announcement.isPinned ? (
                        <>
                          <PinOff size={16} className="mr-1" />
                          取消置顶
                        </>
                      ) : (
                        <>
                          <Pin size={16} className="mr-1" />
                          置顶
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(announcement)}
                    >
                      <Edit size={16} className="mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 size={16} className="mr-1" />
                      删除
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 创建/编辑公告弹窗 */}
      <Modal
        isOpen={showCreateModal || !!editingAnnouncement}
        onClose={closeModal}
        title={editingAnnouncement ? '编辑公告' : '发布新公告'}
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm text-stone-gray mb-1">标题</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入公告标题"
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-gray mb-1">内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="请输入公告内容"
              rows={5}
              className="w-full px-4 py-3 border border-silk-gray rounded-gallery focus:border-champagne-gold focus:outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isPinned" className="text-sm text-stone-gray">置顶公告</label>
          </div>
          <div className="flex gap-3 pt-md">
            <Button variant="outline" className="flex-1" onClick={closeModal}>
              取消
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={editingAnnouncement ? handleUpdate : handleCreate}
              disabled={saving}
            >
              {saving ? '保存中...' : (editingAnnouncement ? '保存' : '发布')}
            </Button>
          </div>
        </div>
      </Modal>
    </SimpleLayout>
  );
}






