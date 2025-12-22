/**
 * 创建人脉资源页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Star, Users, Building } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Badge } from '../../components/ui';
import {
  createNetworkResource,
  checkDuplicate,
  CreateNetworkResourceParams,
  NetworkResourceType,
} from '../../api/network-resources';

export default function NetworkResourceCreatePage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<CreateNetworkResourceParams>({
    resourceType: 'PERSON',
    name: '',
    organization: '',
    title: '',
    industryTags: [],
    region: '',
    relationshipStrength: 3,
    relationshipDesc: '',
    contact: '',
    note: '',
    contactStatus: 'PENDING',
    // 默认仅自己可见，需引荐给其他用户才能让他人看到
    visibilityScopeType: 'CUSTOM',
  });
  
  const [industryInput, setIndustryInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  const handleChange = (field: keyof CreateNetworkResourceParams, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleAddIndustry = () => {
    if (industryInput.trim() && !formData.industryTags?.includes(industryInput.trim())) {
      handleChange('industryTags', [...(formData.industryTags || []), industryInput.trim()]);
      setIndustryInput('');
    }
  };

  const handleRemoveIndustry = (tag: string) => {
    handleChange('industryTags', formData.industryTags?.filter((t) => t !== tag));
  };

  const handleCheckDuplicate = async () => {
    try {
      const result = await checkDuplicate({
        name: formData.name,
        organization: formData.organization,
        title: formData.title,
      });
      setDuplicates(result.duplicates || []);
    } catch (err) {
      console.error('Failed to check duplicates:', err);
    }
  };

  const handleSubmit = async () => {
    // 验证必填字段
    if (formData.resourceType === 'PERSON' && !formData.name) {
      setError('请输入姓名');
      return;
    }
    if (formData.resourceType === 'ORG' && !formData.organization) {
      setError('请输入机构名称');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const resource = await createNetworkResource(formData);
      navigate(`/network-resources/${resource.id}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleLayout title="新增人脉资源">
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

        {/* 资源类型选择 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            资源类型 <span className="text-error">*</span>
          </label>
          <div className="flex gap-md">
            <button
              onClick={() => handleChange('resourceType', 'PERSON')}
              className={`flex-1 p-lg rounded-gallery border transition-colors ${
                formData.resourceType === 'PERSON'
                  ? 'border-champagne-gold bg-champagne-gold/5'
                  : 'border-silk-gray'
              }`}
            >
              <Users size={24} className={formData.resourceType === 'PERSON' ? 'text-champagne-gold' : 'text-stone-gray'} />
              <p className={`text-body mt-sm ${formData.resourceType === 'PERSON' ? 'text-deep-black' : 'text-stone-gray'}`}>
                个人
              </p>
            </button>
            <button
              onClick={() => handleChange('resourceType', 'ORG')}
              className={`flex-1 p-lg rounded-gallery border transition-colors ${
                formData.resourceType === 'ORG'
                  ? 'border-champagne-gold bg-champagne-gold/5'
                  : 'border-silk-gray'
              }`}
            >
              <Building size={24} className={formData.resourceType === 'ORG' ? 'text-champagne-gold' : 'text-stone-gray'} />
              <p className={`text-body mt-sm ${formData.resourceType === 'ORG' ? 'text-deep-black' : 'text-stone-gray'}`}>
                机构
              </p>
            </button>
          </div>
        </div>

        {/* 姓名（个人）/ 机构名称（机构） */}
        {formData.resourceType === 'PERSON' ? (
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              姓名 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={handleCheckDuplicate}
              placeholder="请输入姓名"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        ) : (
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              机构名称 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.organization || ''}
              onChange={(e) => handleChange('organization', e.target.value)}
              onBlur={handleCheckDuplicate}
              placeholder="请输入机构名称"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* 重复提示 */}
        {duplicates.length > 0 && (
          <Card className="p-md bg-warning/10 border-warning/30">
            <p className="text-sm text-warning mb-sm">发现可能重复的资源：</p>
            <div className="space-y-xs">
              {duplicates.map((dup) => (
                <p key={dup.id} className="text-tiny text-charcoal">
                  {dup.name || dup.organization} - {dup.title || ''}
                </p>
              ))}
            </div>
          </Card>
        )}

        {/* 机构（个人填写） */}
        {formData.resourceType === 'PERSON' && (
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              所在机构
            </label>
            <input
              type="text"
              value={formData.organization || ''}
              onChange={(e) => handleChange('organization', e.target.value)}
              placeholder="请输入所在机构"
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* 职位 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            职位
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入职位"
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 行业标签 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            行业标签
          </label>
          <div className="flex gap-sm mb-sm">
            <input
              type="text"
              value={industryInput}
              onChange={(e) => setIndustryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIndustry())}
              placeholder="输入标签后回车添加"
              className="flex-1 bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
            <Button variant="secondary" onClick={handleAddIndustry}>
              添加
            </Button>
          </div>
          {formData.industryTags && formData.industryTags.length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {formData.industryTags.map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => handleRemoveIndustry(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 地区 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            地区
          </label>
          <input
            type="text"
            value={formData.region || ''}
            onChange={(e) => handleChange('region', e.target.value)}
            placeholder="请输入地区"
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 关系强度 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            关系强度
          </label>
          <div className="flex items-center gap-md">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => handleChange('relationshipStrength', level)}
                className="p-1"
              >
                <Star
                  size={28}
                  className={
                    level <= (formData.relationshipStrength || 0)
                      ? 'text-champagne-gold fill-champagne-gold'
                      : 'text-silk-gray'
                  }
                />
              </button>
            ))}
            <span className="text-sm text-stone-gray ml-md">
              {formData.relationshipStrength
                ? ['很弱', '较弱', '一般', '较强', '很强'][formData.relationshipStrength - 1]
                : ''}
            </span>
          </div>
        </div>

        {/* 关系描述 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            关系描述
          </label>
          <textarea
            value={formData.relationshipDesc || ''}
            onChange={(e) => handleChange('relationshipDesc', e.target.value)}
            placeholder="请描述您与此人/机构的关系"
            rows={3}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* 联系方式 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            联系方式
          </label>
          <input
            type="text"
            value={formData.contact || ''}
            onChange={(e) => handleChange('contact', e.target.value)}
            placeholder="电话/微信/邮箱等"
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
          />
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            备注
          </label>
          <textarea
            value={formData.note || ''}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="其他备注信息"
            rows={3}
            className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* 可见范围 */}
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            可见范围
          </label>
          <div className="space-y-sm">
            {/* 仅自己可见 - 推荐选项 */}
            <button
              onClick={() => handleChange('visibilityScopeType', 'CUSTOM')}
              className={`w-full p-md text-left rounded-gallery border transition-colors ${
                formData.visibilityScopeType === 'CUSTOM'
                  ? 'border-champagne-gold bg-champagne-gold/5'
                  : 'border-silk-gray'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={formData.visibilityScopeType === 'CUSTOM' ? 'text-deep-black font-medium' : 'text-stone-gray'}>
                  仅自己可见
                </span>
                <span className="text-xs text-champagne-gold bg-champagne-gold/10 px-2 py-0.5 rounded">推荐</span>
              </div>
              <p className="text-xs text-stone-gray mt-1">需引荐给其他用户后，对方才能看到</p>
            </button>
            
            {/* 其他可见性选项 */}
            <button
              onClick={() => handleChange('visibilityScopeType', 'ROLE_MIN_LEVEL')}
              className={`w-full p-md text-left rounded-gallery border transition-colors ${
                formData.visibilityScopeType === 'ROLE_MIN_LEVEL'
                  ? 'border-champagne-gold bg-champagne-gold/5'
                  : 'border-silk-gray'
              }`}
            >
              <span className={formData.visibilityScopeType === 'ROLE_MIN_LEVEL' ? 'text-deep-black' : 'text-stone-gray'}>
                核心合伙人及以上可见
              </span>
            </button>
            
            <button
              onClick={() => handleChange('visibilityScopeType', 'ALL')}
              className={`w-full p-md text-left rounded-gallery border transition-colors ${
                formData.visibilityScopeType === 'ALL'
                  ? 'border-champagne-gold bg-champagne-gold/5'
                  : 'border-silk-gray'
              }`}
            >
              <span className={formData.visibilityScopeType === 'ALL' ? 'text-deep-black' : 'text-stone-gray'}>
                所有人可见
              </span>
            </button>
          </div>
        </div>

        {/* 提交按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '创建中...' : '创建资源'}
        </Button>
      </motion.div>
    </SimpleLayout>
  );
}

