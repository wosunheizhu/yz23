/**
 * 合伙人详情页
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.5: 合伙人名录（详情页）
 * - 显示公开字段
 * - CTA：发起私聊
 * - 我的本地标签与备注
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Edit3, Trash2, Plus, X, ArrowLeft, Building, Calendar, Award, Users, Briefcase, Network } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Avatar, Loading, Badge } from '../../components/ui';
import { usersApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { UserDetail, LocalNote, UpsertNoteParams } from '../../api/users';

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [localNote, setLocalNote] = useState<LocalNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  const isSelf = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [userDetail, note] = await Promise.all([
          usersApi.getUserById(id),
          !isSelf ? usersApi.getLocalNote(id).catch(() => null) : null,
        ]);
        setUser(userDetail);
        if (note) {
          setLocalNote(note);
          setNoteText(note.note || '');
          setNoteTags(note.tags || []);
        }
      } catch (error) {
        console.error('加载用户详情失败', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, isSelf]);

  const handleSaveNote = async () => {
    if (!id) return;
    setIsSavingNote(true);
    try {
      const params: UpsertNoteParams = {
        note: noteText || undefined,
        tags: noteTags.length > 0 ? noteTags : undefined,
      };
      const result = await usersApi.upsertLocalNote(id, params);
      setLocalNote(result);
      setShowNoteEditor(false);
    } catch (error) {
      console.error('保存备注失败', error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !noteTags.includes(newTag.trim())) {
      setNoteTags([...noteTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNoteTags(noteTags.filter((t) => t !== tag));
  };

  const handleDeleteNote = async () => {
    if (!id) return;
    setIsDeletingNote(true);
    try {
      await usersApi.deleteLocalNote(id);
      setLocalNote(null);
      setNoteText('');
      setNoteTags([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('删除备注失败', error);
    } finally {
      setIsDeletingNote(false);
    }
  };

  const getRoleLabel = (roleLevel: string) => {
    switch (roleLevel) {
      case 'FOUNDER':
        return '联合创始人';
      case 'CORE_PARTNER':
        return '核心合伙人';
      default:
        return '合伙人';
    }
  };

  const getRoleBadgeVariant = (roleLevel: string) => {
    switch (roleLevel) {
      case 'FOUNDER':
        return 'warning';
      case 'CORE_PARTNER':
        return 'success';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <SimpleLayout title="合伙人详情">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!user) {
    return (
      <SimpleLayout title="合伙人详情">
        <div className="flex items-center justify-center h-64">
          <p className="text-stone-gray">用户不存在</p>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="合伙人详情">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-lg"
      >
        {/* 个人信息卡片 */}
        <Card className="p-lg">
          <div className="flex items-start gap-4">
            <Avatar 
              name={user.name} 
              src={user.avatar} 
              size="xl" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-display text-deep-black truncate">{user.name}</h1>
                {user.isAdmin && (
                  <Badge variant="error" size="sm">管理员</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getRoleBadgeVariant(user.roleLevel) as any} size="sm">
                  {getRoleLabel(user.roleLevel)}
                </Badge>
              </div>
              {user.signature && (
                <p className="text-sm text-stone-gray italic">"{user.signature}"</p>
              )}
            </div>
          </div>
        </Card>

        {/* 操作按钮 */}
        {!isSelf && (
          <div className="flex gap-3">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate(`/messages/${id}`)}
            >
              <MessageCircle size={18} className="mr-2" />
              发起私聊
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNoteEditor(!showNoteEditor)}
            >
              <Edit3 size={18} />
            </Button>
          </div>
        )}

        {/* 自我描述 */}
        {user.selfDescription && (
          <Card className="p-lg">
            <h3 className="text-xs text-stone-gray tracking-wider uppercase mb-3">自我描述</h3>
            <p className="text-deep-black leading-relaxed">{user.selfDescription}</p>
          </Card>
        )}

        {/* 基本信息 */}
        <Card className="p-lg">
          <h3 className="text-xs text-stone-gray tracking-wider uppercase mb-4">基本信息</h3>
          <div className="space-y-3">
            {user.organization && user.organizationPublic && (
              <div className="flex items-center gap-3">
                <Building size={16} className="text-stone-gray flex-shrink-0" />
                <span className="text-deep-black">{user.organization}</span>
              </div>
            )}
            {user.gender && (
              <div className="flex items-center gap-3">
                <Users size={16} className="text-stone-gray flex-shrink-0" />
                <span className="text-deep-black">{user.gender}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-stone-gray flex-shrink-0" />
              <span className="text-deep-black">
                {new Date(user.joinedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} 加入
              </span>
            </div>
          </div>
        </Card>

        {/* 擅长领域 */}
        {user.expertiseAreas && user.expertiseAreas.length > 0 && (
          <Card className="p-lg">
            <h3 className="text-xs text-stone-gray tracking-wider uppercase mb-3">擅长领域</h3>
            <div className="flex flex-wrap gap-2">
              {user.expertiseAreas.map((area) => (
                <span 
                  key={area} 
                  className="text-sm px-3 py-1.5 bg-champagne-gold/10 text-champagne-gold rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 标签 */}
        {user.tags && user.tags.length > 0 && (
          <Card className="p-lg">
            <h3 className="text-xs text-stone-gray tracking-wider uppercase mb-3">个人标签</h3>
            <div className="flex flex-wrap gap-2">
              {user.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="text-sm px-3 py-1.5 bg-gallery-gray text-stone-gray rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 贡献统计（PRD 6.1.4 C2） */}
        {user.stats && (
          <Card className="p-lg">
            <h3 className="text-xs text-stone-gray tracking-wider uppercase mb-4">贡献统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gallery-gray/50 rounded-gallery">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Briefcase size={16} className="text-champagne-gold" />
                  <span className="text-2xl font-display text-deep-black">{user.stats.projectCount}</span>
                </div>
                <div className="text-xs text-stone-gray">参与项目</div>
              </div>
              <div className="text-center p-3 bg-gallery-gray/50 rounded-gallery">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Award size={16} className="text-champagne-gold" />
                  <span className="text-2xl font-display text-deep-black">{user.stats.resourceCount}</span>
                </div>
                <div className="text-xs text-stone-gray">提供资源</div>
              </div>
              <div className="text-center p-3 bg-gallery-gray/50 rounded-gallery">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users size={16} className="text-champagne-gold" />
                  <span className="text-2xl font-display text-deep-black">{user.stats.guestInviteCount}</span>
                </div>
                <div className="text-xs text-stone-gray">邀请嘉宾</div>
              </div>
              <div className="text-center p-3 bg-gallery-gray/50 rounded-gallery">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Network size={16} className="text-champagne-gold" />
                  <span className="text-2xl font-display text-deep-black">{user.stats.networkResourceCount}</span>
                </div>
                <div className="text-xs text-stone-gray">人脉资源</div>
              </div>
            </div>
          </Card>
        )}

        {/* 本地标签与备注（仅对非本人显示）*/}
        {!isSelf && (
          <Card className="p-lg border-champagne-gold/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-champagne-gold tracking-wider uppercase flex items-center gap-2">
                我的本地备注
                <span className="text-stone-gray text-xs font-normal normal-case">（仅自己可见）</span>
              </h3>
              {localNote && !showNoteEditor && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-stone-gray hover:text-error transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {showNoteEditor ? (
              <div className="space-y-4">
                {/* 本地标签输入 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2">本地标签</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="输入标签后按回车"
                      className="flex-1 bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none"
                    />
                    <Button variant="secondary" size="sm" onClick={handleAddTag}>
                      <Plus size={16} />
                    </Button>
                  </div>
                  {noteTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {noteTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-champagne-gold/10 text-champagne-gold rounded-full flex items-center gap-1"
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-error">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 备注文本 */}
                <div>
                  <label className="block text-stone-gray text-xs mb-2">备注</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="记录一些关于这位合伙人的备注..."
                    rows={4}
                    className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none resize-none"
                  />
                </div>

                {/* 保存按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                  >
                    {isSavingNote ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNoteEditor(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : localNote ? (
              <div>
                {localNote.tags && localNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {localNote.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-champagne-gold/10 text-champagne-gold rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {localNote.note && (
                  <p className="text-deep-black text-sm">{localNote.note}</p>
                )}
                {!localNote.note && (!localNote.tags || localNote.tags.length === 0) && (
                  <p className="text-stone-gray text-sm">暂无本地备注</p>
                )}
              </div>
            ) : (
              <p className="text-stone-gray text-sm">暂无本地备注，点击右上角按钮添加</p>
            )}
          </Card>
        )}

        {/* 编辑资料按钮（仅本人） */}
        {isSelf && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/profile/edit')}
          >
            编辑资料
          </Button>
        )}
      </motion.div>

      {/* 删除确认弹窗 (PRD 6.1.5 D3) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-deep-black/50 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-pure-white border border-silk-gray rounded-gallery p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-deep-black font-display text-lg mb-3">确认删除</h3>
            <p className="text-stone-gray text-sm mb-6">
              确定要删除对"{user.name}"的本地备注吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-error hover:bg-error/90"
                onClick={handleDeleteNote}
                disabled={isDeletingNote}
              >
                {isDeletingNote ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </SimpleLayout>
  );
}
