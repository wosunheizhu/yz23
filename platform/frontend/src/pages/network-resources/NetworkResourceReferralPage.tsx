/**
 * 人脉资源引荐页面
 * 点对点引荐：引荐给特定合伙人，仅对方可见
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Building, 
  Send, 
  Search,
  ChevronRight,
  AlertCircle,
  Check
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Empty, Badge, Avatar } from '../../components/ui';
import {
  getNetworkResource,
  createReferral,
  NetworkResource,
  ReferralType,
  RESOURCE_TYPE_LABELS,
} from '../../api/network-resources';
import { listUsers, UserListItem } from '../../api/users';

// 引荐类型选项
const REFERRAL_TYPES: { value: ReferralType; label: string; desc: string }[] = [
  { value: 'MEETING', label: '会议引荐', desc: '在会议中介绍此人脉' },
  { value: 'PROJECT', label: '项目合作', desc: '推荐参与项目合作' },
  { value: 'DEMAND', label: '需求对接', desc: '推荐对接业务需求' },
  { value: 'OTHER', label: '其他', desc: '其他引荐场景' },
];

export default function NetworkResourceReferralPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<NetworkResource | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // 表单状态
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [referralType, setReferralType] = useState<ReferralType>('OTHER');
  const [description, setDescription] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (resourceId: string) => {
    try {
      setLoading(true);
      const [resourceData, usersData] = await Promise.all([
        getNetworkResource(resourceId),
        listUsers({ pageSize: 100 }),
      ]);
      setResource(resourceData);
      setUsers(usersData.data || []);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!id || !targetUserId) {
      setError('请选择要引荐给的合伙人');
      return;
    }
    if (!description.trim()) {
      setError('请填写引荐说明');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await createReferral({
        networkResourceId: id,
        targetUserId,
        referralType,
        description: description.trim(),
      });
      
      setSuccess(true);
      
      // 2秒后跳转
      setTimeout(() => {
        navigate(`/network-resources/${id}`, { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error('引荐失败:', err);
      setError(err.response?.data?.error?.message || '引荐失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 筛选用户（排除当前资源创建者）
  const filteredUsers = users.filter(user => {
    if (resource && user.id === resource.createdByUserId) return false;
    if (!userSearch) return true;
    return user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
           (user.organization && user.organization.toLowerCase().includes(userSearch.toLowerCase()));
  });

  const selectedUser = users.find(u => u.id === targetUserId);

  if (loading) {
    return (
      <SimpleLayout title="引荐人脉">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!resource) {
    return (
      <SimpleLayout title="引荐人脉">
        <Empty description="资源不存在" />
      </SimpleLayout>
    );
  }

  if (success) {
    return (
      <SimpleLayout title="引荐成功">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-64 px-lg"
        >
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-lg">
            <Check size={32} className="text-success" />
          </div>
          <h2 className="font-serif-cn text-title text-deep-black mb-sm">引荐成功</h2>
          <p className="text-body text-stone-gray text-center">
            已将人脉资源「{resource.name || resource.organization}」引荐给 {selectedUser?.name}
          </p>
          <p className="text-tiny text-stone-gray mt-md">正在跳转...</p>
        </motion.div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="引荐人脉">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-lg py-lg space-y-xl"
      >
        {/* 被引荐的资源 */}
        <Card className="p-lg">
          <p className="text-tiny text-stone-gray mb-sm">引荐的人脉资源</p>
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 rounded-full bg-gallery-gray flex items-center justify-center">
              {resource.resourceType === 'PERSON' ? (
                <Users size={24} className="text-stone-gray" />
              ) : (
                <Building size={24} className="text-stone-gray" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-deep-black">
                {resource.name || resource.organization || '未命名'}
              </h3>
              <p className="text-body-sm text-stone-gray">
                {resource.organization && resource.title
                  ? `${resource.organization} · ${resource.title}`
                  : resource.organization || resource.title || RESOURCE_TYPE_LABELS[resource.resourceType]}
              </p>
            </div>
          </div>
        </Card>

        {/* 选择目标合伙人 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md">
            引荐给 <span className="text-error">*</span>
          </h3>
          <p className="text-body-sm text-stone-gray mb-md">
            选择要引荐给的合伙人（仅对方可见此引荐）
          </p>

          {selectedUser ? (
            <div className="flex items-center justify-between p-md bg-champagne-gold/10 rounded-gallery mb-md">
              <div className="flex items-center gap-md">
                <Avatar name={selectedUser.name} size="md" />
                <div>
                  <p className="font-medium text-deep-black">{selectedUser.name}</p>
                  <p className="text-body-sm text-stone-gray">{selectedUser.organization}</p>
                </div>
              </div>
              <button
                onClick={() => setTargetUserId('')}
                className="text-stone-gray hover:text-deep-black"
              >
                更换
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-md">
                <Search size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-stone-gray" />
                <input
                  type="text"
                  placeholder="搜索合伙人..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-md py-sm border border-silk-gray rounded-gallery focus:outline-none focus:border-champagne-gold"
                />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-sm">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-stone-gray py-md">没有找到合伙人</p>
                ) : (
                  filteredUsers.slice(0, 10).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setTargetUserId(user.id);
                        setUserSearch('');
                      }}
                      className="w-full flex items-center gap-md p-sm rounded-gallery hover:bg-gallery-gray transition-colors"
                    >
                      <Avatar name={user.name} size="sm" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-deep-black">{user.name}</p>
                        {user.organization && (
                          <p className="text-body-sm text-stone-gray">{user.organization}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-stone-gray" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </Card>

        {/* 引荐类型 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md">引荐类型</h3>
          <div className="grid grid-cols-2 gap-sm">
            {REFERRAL_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setReferralType(type.value)}
                className={`p-md rounded-gallery border text-left transition-colors ${
                  referralType === type.value
                    ? 'border-champagne-gold bg-champagne-gold/5'
                    : 'border-silk-gray hover:border-stone-gray'
                }`}
              >
                <p className={`font-medium ${referralType === type.value ? 'text-champagne-gold' : 'text-deep-black'}`}>
                  {type.label}
                </p>
                <p className="text-tiny text-stone-gray mt-xs">{type.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* 引荐说明 */}
        <Card className="p-lg">
          <h3 className="section-title mb-md">
            引荐说明 <span className="text-error">*</span>
          </h3>
          <textarea
            placeholder="请简要说明引荐原因和建议的合作方向..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            rows={4}
            className="w-full p-md border border-silk-gray rounded-gallery focus:outline-none focus:border-champagne-gold resize-none"
          />
        </Card>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-sm p-md bg-error/10 rounded-gallery">
            <AlertCircle size={16} className="text-error" />
            <p className="text-body text-error">{error}</p>
          </div>
        )}

        {/* 提交按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || !targetUserId || !description.trim()}
        >
          <Send size={16} className="mr-2" />
          {submitting ? '引荐中...' : '确认引荐'}
        </Button>

        {/* 提示 */}
        <p className="text-center text-tiny text-stone-gray">
          引荐后，此人脉资源将仅对目标合伙人可见
        </p>
      </motion.div>
    </SimpleLayout>
  );
}






