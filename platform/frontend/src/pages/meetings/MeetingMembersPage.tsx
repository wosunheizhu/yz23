/**
 * 会议人员管理页面
 * 统一管理内部参与者和外部嘉宾
 * 根据PRD: 外部嘉宾需要记录邀请人
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Users, UserCheck, Building2, Briefcase, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Badge, Loading, Empty, Avatar, Modal, Button, Input } from '@/components/ui';
import { meetingsApi, MeetingDetailResponse, ParticipantResponse, GuestResponse, AddGuestInput, GuestCategory } from '@/api/meetings';
import { usersApi, UserListItem } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';

const GUEST_CATEGORY_LABELS: Record<string, string> = {
  PUBLIC_CO_DMHG: '上市公司董监高',
  FIN_EXEC: '金融从业高管',
  PUBLIC_CHAIRMAN_CONTROLLER: '上市公司董事长/实控人',
  MINISTRY_LEADER: '部委部级领导',
  BUREAU_LEADER: '厅级领导',
  DEPT_LEADER: '处级领导',
  OTHER: '其他',
};

const GUEST_CATEGORY_OPTIONS = Object.entries(GUEST_CATEGORY_LABELS);

type TabType = 'internal' | 'external';

export default function MeetingMembersPage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('internal');
  
  // 添加弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'internal' | 'external'>('internal');

  // 内部成员搜索
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserListItem[]>([]);

  // 外部嘉宾表单
  const [newGuest, setNewGuest] = useState<AddGuestInput>({
    name: '',
    organization: '',
    title: '',
    contact: '',
    guestCategory: 'OTHER',
  });

  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  // 边输入边搜索
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => {
        handleSearch();
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, meeting]);

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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await usersApi.listUsers({ search: searchQuery, pageSize: 10 });
      // 过滤掉已经是参与者的用户和已选择的用户
      const existingIds = new Set(meeting?.participants?.map(p => p.user.id) || []);
      const selectedIds = new Set(selectedUsers.map(u => u.id));
      setSearchResults((response.data || []).filter(u => !existingIds.has(u.id) && !selectedIds.has(u.id)));
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, meeting, selectedUsers]);

  const handleAddInternal = async () => {
    if (!id || selectedUsers.length === 0) {
      alert('请选择要添加的成员');
      return;
    }

    try {
      setSubmitting(true);
      // 批量添加参与者
      for (const user of selectedUsers) {
        await meetingsApi.addParticipant(id, {
          userId: user.id,
          role: 'ATTENDEE',
        });
      }
      closeAddModal();
      loadMeeting();
    } catch (error: any) {
      console.error('添加成员失败:', error);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || '添加失败，请重试';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExternal = async () => {
    if (!id || !newGuest.name.trim() || !newGuest.organization.trim() || !newGuest.title.trim()) {
      alert('请填写嘉宾姓名、所属组织和职位');
      return;
    }

    try {
      setSubmitting(true);
      // 添加外部嘉宾，邀请人默认为当前用户（后端会自动记录）
      await meetingsApi.addGuest(id, newGuest);
      closeAddModal();
      loadMeeting();
    } catch (error: any) {
      console.error('添加嘉宾失败:', error);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || '添加失败，请重试';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveInternal = async (userId: string) => {
    if (!id) return;
    try {
      setSubmitting(true);
      await meetingsApi.removeParticipant(id, userId);
      setDeleteConfirmId(null);
      loadMeeting();
    } catch (error) {
      console.error('移除成员失败:', error);
      alert('移除失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveExternal = async (guestId: string) => {
    try {
      setSubmitting(true);
      await meetingsApi.deleteGuest(guestId);
      setDeleteConfirmId(null);
      loadMeeting();
    } catch (error) {
      console.error('删除嘉宾失败:', error);
      alert('删除失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = (tab: TabType) => {
    setActiveTab(tab);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedUsers([]);
    setSearchQuery('');
    setSearchResults([]);
    setNewGuest({
      name: '',
      organization: '',
      title: '',
      contact: '',
      guestCategory: 'OTHER',
    });
  };

  const toggleUserSelection = (user: UserListItem) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
    // 从搜索结果中移除已选用户
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const confirmDelete = (itemId: string, type: 'internal' | 'external') => {
    setDeleteConfirmId(itemId);
    setDeleteType(type);
  };

  if (loading) {
    return (
      <AppLayout showBottomNav={false} headerTitle="会议人员" showBack>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout showBottomNav={false} headerTitle="会议人员" showBack>
        <Empty description="未找到该会议" />
      </AppLayout>
    );
  }

  const participants = meeting.participants || [];
  const guests = meeting.guests || [];

  return (
    <AppLayout showBottomNav={false} headerTitle="会议人员" showBack>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* 会议信息 */}
        <Card className="p-4">
          <h2 className="text-base font-medium text-ink-black mb-1">{meeting.topic}</h2>
          <p className="text-xs text-stone-gray">
            {new Date(meeting.startTime).toLocaleDateString('zh-CN')} · {meeting.venue?.name || '线上会议'}
          </p>
        </Card>

        {/* 添加按钮 */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => openAddModal('internal')}
          >
            <Users className="w-4 h-4" />
            添加内部成员
          </Button>
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => openAddModal('external')}
          >
            <UserCheck className="w-4 h-4" />
            添加外部嘉宾
          </Button>
        </div>

        {/* 内部参与者列表 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-ink-black mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-gray" />
            内部参与者 ({participants.length})
          </h3>

          {participants.length === 0 ? (
            <p className="text-sm text-stone-gray text-center py-4">暂无内部参与者</p>
          ) : (
            <div className="space-y-3">
              {participants.map((participant: ParticipantResponse) => (
                <div 
                  key={participant.id} 
                  className="flex items-center justify-between p-3 bg-gallery-gray rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={participant.user?.avatar} 
                      name={participant.user?.name || '未知'} 
                      size="sm" 
                    />
                    <div>
                      <p className="text-sm font-medium text-ink-black">{participant.user?.name}</p>
                      <p className="text-xs text-stone-gray">
                        {participant.role === 'HOST' ? '主持人' : '参与者'}
                      </p>
                    </div>
                  </div>
                  {participant.role !== 'HOST' && (
                    <button
                      className="p-2 text-stone-gray hover:text-red-500 transition-colors"
                      onClick={() => confirmDelete(participant.user.id, 'internal')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 外部嘉宾列表 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-ink-black mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-stone-gray" />
            外部嘉宾 ({guests.length})
          </h3>

          {guests.length === 0 ? (
            <p className="text-sm text-stone-gray text-center py-4">暂无外部嘉宾</p>
          ) : (
            <div className="space-y-3">
              {guests.map((guest: GuestResponse) => (
                <div 
                  key={guest.id} 
                  className="flex items-center justify-between p-3 bg-gallery-gray rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={guest.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink-black">{guest.name}</p>
                      <div className="flex items-center gap-1 text-xs text-stone-gray">
                        <Building2 className="w-3 h-3" />
                        <span>{guest.organization}</span>
                        <span>·</span>
                        <Briefcase className="w-3 h-3" />
                        <span>{guest.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge size="xs" variant="secondary">
                          {GUEST_CATEGORY_LABELS[guest.guestCategory] || guest.guestCategory}
                        </Badge>
                        {guest.invitedBy && (
                          <span className="text-xs text-stone-gray">
                            邀请人: {guest.invitedBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className="p-2 text-stone-gray hover:text-red-500 transition-colors"
                    onClick={() => confirmDelete(guest.id, 'external')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* 添加人员弹窗 */}
      <Modal
        isOpen={showAddModal}
        onClose={closeAddModal}
        title={activeTab === 'internal' ? '添加内部成员' : '添加外部嘉宾'}
      >
        <div className="space-y-4">
          {/* Tab 切换 */}
          <div className="flex border-b border-mist-gray">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'internal'
                  ? 'text-ink-black border-b-2 border-champagne-gold'
                  : 'text-stone-gray'
              }`}
              onClick={() => setActiveTab('internal')}
            >
              内部成员
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'external'
                  ? 'text-ink-black border-b-2 border-champagne-gold'
                  : 'text-stone-gray'
              }`}
              onClick={() => setActiveTab('external')}
            >
              外部嘉宾
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'internal' ? (
              <motion.div
                key="internal"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* 搜索框 */}
                <Input
                  placeholder="输入姓名搜索合伙人..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* 搜索结果 */}
                {searching && (
                  <p className="text-xs text-stone-gray text-center py-2">搜索中...</p>
                )}
                
                {!searching && searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-mist-gray rounded-lg p-2">
                    <p className="text-xs text-stone-gray mb-1">点击添加：</p>
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gallery-gray transition-colors"
                        onClick={() => toggleUserSelection(user)}
                      >
                        <Avatar src={user.avatar} name={user.name} size="sm" />
                        <div className="text-left flex-1">
                          <p className="text-sm text-ink-black">{user.name}</p>
                          <p className="text-xs text-stone-gray">{user.email || user.organization}</p>
                        </div>
                        <span className="text-xs text-champagne-gold">+ 添加</span>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && searchQuery.trim() && searchResults.length === 0 && (
                  <p className="text-xs text-stone-gray text-center py-2">未找到匹配的用户</p>
                )}

                {/* 已选用户 */}
                {selectedUsers.length > 0 && (
                  <div className="p-3 bg-gallery-gray rounded-lg">
                    <p className="text-xs text-stone-gray mb-2">已选择 ({selectedUsers.length})：</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div 
                          key={user.id}
                          className="flex items-center gap-2 px-2 py-1 bg-pure-white rounded-full border border-silk-gray"
                        >
                          <Avatar src={user.avatar} name={user.name} size="xs" />
                          <span className="text-sm text-ink-black">{user.name}</span>
                          <button
                            className="text-stone-gray hover:text-red-500"
                            onClick={() => removeSelectedUser(user.id)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={closeAddModal}>
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddInternal}
                    loading={submitting}
                    disabled={selectedUsers.length === 0}
                  >
                    添加 {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="external"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Input
                  label="姓名"
                  placeholder="请输入嘉宾姓名"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="所属组织"
                  placeholder="请输入所属公司/机构"
                  value={newGuest.organization}
                  onChange={(e) => setNewGuest(prev => ({ ...prev, organization: e.target.value }))}
                  required
                />
                <Input
                  label="职位"
                  placeholder="请输入职位"
                  value={newGuest.title}
                  onChange={(e) => setNewGuest(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                <Input
                  label="联系方式（可选）"
                  placeholder="请输入联系方式"
                  value={newGuest.contact || ''}
                  onChange={(e) => setNewGuest(prev => ({ ...prev, contact: e.target.value }))}
                />
                <div>
                  <label className="block text-sm text-stone-gray mb-1.5">
                    嘉宾类别
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-mist-gray rounded-lg text-sm focus:outline-none focus:border-ink-black transition-colors"
                    value={newGuest.guestCategory}
                    onChange={(e) => setNewGuest(prev => ({ ...prev, guestCategory: e.target.value as GuestCategory }))}
                  >
                    {GUEST_CATEGORY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                {/* 邀请人信息 */}
                <div className="p-3 bg-gallery-gray rounded-lg">
                  <p className="text-xs text-stone-gray mb-1">邀请人（自动记录）</p>
                  <div className="flex items-center gap-2">
                    <Avatar name={currentUser?.name || ''} size="xs" />
                    <span className="text-sm text-ink-black">{currentUser?.name || '当前用户'}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={closeAddModal}>
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddExternal}
                    loading={submitting}
                    disabled={!newGuest.name.trim() || !newGuest.organization.trim() || !newGuest.title.trim()}
                  >
                    添加
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={deleteType === 'internal' ? '移除成员' : '删除嘉宾'}
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-gray">
            确定要{deleteType === 'internal' ? '移除此成员' : '删除此嘉宾'}吗？
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirmId(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteConfirmId) {
                  if (deleteType === 'internal') {
                    handleRemoveInternal(deleteConfirmId);
                  } else {
                    handleRemoveExternal(deleteConfirmId);
                  }
                }
              }}
              loading={submitting}
            >
              确认
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

