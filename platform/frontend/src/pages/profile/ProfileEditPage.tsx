/**
 * 个人资料编辑页面
 * 元征 · 合伙人赋能平台
 * 
 * PRD 8.4: 个人信息表单
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Avatar } from '../../components/ui';
import { usersApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { UpdateProfileParams } from '../../api/users';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState<UpdateProfileParams>({
    name: '',
    gender: undefined,
    birthDate: undefined,
    selfDescription: '',
    expertiseAreas: [],
    organization: '',
    organizationPublic: true,
    contactInfo: '',
    contactInfoPublic: false,
    address: '',
    addressPublic: false,
    tags: [],
    hobbies: [],
    signature: '',
  });

  // 标签输入
  const [newTag, setNewTag] = useState('');
  const [newExpertise, setNewExpertise] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfile = async () => {
      try {
        const profile = await usersApi.getUserById(user.id);
        setFormData({
          name: profile.name,
          gender: profile.gender || undefined,
          birthDate: profile.birthDate || undefined,
          selfDescription: profile.selfDescription || '',
          expertiseAreas: profile.expertiseAreas || [],
          organization: profile.organization || '',
          organizationPublic: profile.organizationPublic,
          contactInfo: profile.contactInfo || '',
          contactInfoPublic: profile.contactInfoPublic,
          address: profile.address || '',
          addressPublic: profile.addressPublic,
          tags: profile.tags || [],
          hobbies: profile.hobbies || [],
          signature: profile.signature || '',
        });
      } catch (err) {
        console.error('加载资料失败', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      // 处理日期格式和空字符串
      const submitData = {
        ...formData,
        // 将日期格式转换为 ISO 格式，或设为 null
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        // 空字符串转为 undefined，避免验证错误
        selfDescription: formData.selfDescription || undefined,
        organization: formData.organization || undefined,
        contactInfo: formData.contactInfo || undefined,
        address: formData.address || undefined,
        signature: formData.signature || undefined,
      };
      const result = await usersApi.updateProfile(user.id, submitData);
      // 更新 store 中的用户信息
      setUser({
        ...user,
        name: result.name,
        avatar: result.avatar || avatarPreview || user.avatar,
      });
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter((t) => t !== tag) });
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.expertiseAreas?.includes(newExpertise.trim())) {
      setFormData({ ...formData, expertiseAreas: [...(formData.expertiseAreas || []), newExpertise.trim()] });
      setNewExpertise('');
    }
  };

  const removeExpertise = (area: string) => {
    setFormData({ ...formData, expertiseAreas: formData.expertiseAreas?.filter((a) => a !== area) });
  };

  if (isLoading) {
    return (
      <SimpleLayout title="编辑资料">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout 
      title="编辑资料"
      rightAction={
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving}
          className="text-champagne-gold"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 错误提示 */}
        {error && (
          <Card className="p-md bg-error/10 border-error/30">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        {/* 头像 */}
        <div className="flex flex-col items-center">
          <Avatar 
            name={formData.name || '用户'} 
            src={user?.avatarUrl} 
            size="xl" 
          />
        </div>

        {/* 基本信息 */}
        <Card className="p-lg space-y-lg">
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray">基本信息</h3>
          
          {/* 姓名 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2">
              姓名 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
              required
            />
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2">
              性别 <span className="text-error">*</span>
            </label>
            <div className="flex gap-3">
              {['男', '女', '其他'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: g })}
                  className={`flex-1 py-2.5 rounded-gallery border transition-colors ${
                    formData.gender === g
                      ? 'border-champagne-gold bg-champagne-gold/5 text-deep-black'
                      : 'border-silk-gray text-stone-gray'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 出生日期 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2">出生日期</label>
            <input
              type="date"
              value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value || undefined })}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>

          {/* 自我描述 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2">
              自我描述 <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.selfDescription}
              onChange={(e) => setFormData({ ...formData, selfDescription: e.target.value })}
              rows={4}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors resize-none"
              placeholder="介绍一下自己..."
            />
          </div>

          {/* 个性签名 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2">个性签名</label>
            <input
              type="text"
              value={formData.signature}
              onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
              placeholder="一句话介绍自己"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        </Card>

        {/* 擅长领域 */}
        <Card className="p-lg space-y-md">
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray">擅长领域</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newExpertise}
              onChange={(e) => setNewExpertise(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
              placeholder="输入擅长领域"
              className="flex-1 bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
            <Button variant="secondary" onClick={addExpertise}>
              <Plus size={16} />
            </Button>
          </div>
          {(formData.expertiseAreas?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.expertiseAreas?.map((area) => (
                <span key={area} className="text-sm px-3 py-1.5 bg-champagne-gold/10 text-champagne-gold rounded-full flex items-center gap-2">
                  {area}
                  <button type="button" onClick={() => removeExpertise(area)} className="hover:text-error">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* 组织信息 */}
        <Card className="p-lg space-y-lg">
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray">组织信息</h3>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-stone-gray text-xs">所属组织</label>
              <label className="flex items-center gap-2 text-xs text-stone-gray">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, organizationPublic: !formData.organizationPublic })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    formData.organizationPublic ? 'bg-champagne-gold' : 'bg-silk-gray'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    formData.organizationPublic ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                公开
              </label>
            </div>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-stone-gray text-xs">联系方式</label>
              <label className="flex items-center gap-2 text-xs text-stone-gray">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contactInfoPublic: !formData.contactInfoPublic })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    formData.contactInfoPublic ? 'bg-champagne-gold' : 'bg-silk-gray'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    formData.contactInfoPublic ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                公开
              </label>
            </div>
            <input
              type="text"
              value={formData.contactInfo}
              onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-stone-gray text-xs">地址</label>
              <label className="flex items-center gap-2 text-xs text-stone-gray">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, addressPublic: !formData.addressPublic })}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    formData.addressPublic ? 'bg-champagne-gold' : 'bg-silk-gray'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    formData.addressPublic ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                公开
              </label>
            </div>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        </Card>

        {/* 个人标签 */}
        <Card className="p-lg space-y-md">
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray">个人标签</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="输入标签"
              className="flex-1 bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            />
            <Button variant="secondary" onClick={addTag}>
              <Plus size={16} />
            </Button>
          </div>
          {(formData.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span key={tag} className="text-sm px-3 py-1.5 bg-gallery-gray text-stone-gray rounded-full flex items-center gap-2">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-error">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* 底部保存按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存修改'}
        </Button>
      </motion.div>
    </SimpleLayout>
  );
}
