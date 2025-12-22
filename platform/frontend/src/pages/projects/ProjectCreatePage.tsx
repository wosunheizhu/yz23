/**
 * 创建项目页面
 * 根据 PRD v3 第 6.3.2 和 6.3.3 节要求
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Plus, 
  X,
  Search,
  Users,
  FileText,
  PieChart
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading } from '../../components/ui';
import { 
  createProject, 
  CreateProjectDto, 
  BUSINESS_TYPE_LABELS,
  BUSINESS_STATUS_LABELS,
  projectsApi,
  ProjectListItem
} from '../../api/projects';
import { listUsers, UserListItem } from '../../api/users';
import { useAuthStore } from '../../stores/authStore';

// 步骤定义
const STEPS = [
  { id: 'notice', title: '须知', icon: FileText },
  { id: 'basic', title: '基本信息', icon: Users },
  { id: 'shares', title: '股权结构', icon: PieChart },
];

// 可见性选项
const VISIBILITY_OPTIONS = [
  { value: 'ALL', label: '全部合伙人' },
  { value: 'ROLE_MIN_LEVEL', label: '按角色级别' },
  { value: 'CUSTOM', label: '自定义' },
];

const ROLE_LEVEL_OPTIONS = [
  { value: 3, label: '仅联合创始人' },
  { value: 2, label: '核心合伙人及以上' },
  { value: 1, label: '普通合伙人及以上' },
];

// 股权持有人类型
interface ShareHolder {
  id: string;
  holderName: string;
  holderId?: string;
  percentage: number;
  note?: string;
  isYuanzheng?: boolean;
}

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // 步骤状态
  const [currentStep, setCurrentStep] = useState(0);
  const [noticeConfirmed, setNoticeConfirmed] = useState(false);
  
  // 用户列表
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // 关联项目列表
  const [existingProjects, setExistingProjects] = useState<ProjectListItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    businessType: 'OTHER',
    industry: '',
    region: '',
    description: '',
    businessStatus: 'ONGOING',
    visibilityScopeType: 'ALL',
    visibilityMinRoleLevel: 1,
    visibilityUserIds: [] as string[],
    linkedProjectIds: [] as string[],
  });
  
  // 负责人和成员
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // 股权结构
  const [shares, setShares] = useState<ShareHolder[]>([
    { id: 'yuanzheng', holderName: '元征', percentage: 51, isYuanzheng: true },
  ]);
  
  // 搜索
  const [leaderSearch, setLeaderSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await listUsers({ pageSize: 100 });
        setUsers(response.data || []);
        // 默认将当前用户设为负责人
        if (user) {
          setSelectedLeaders([user.id]);
        }
      } catch (err) {
        console.error('加载用户列表失败:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, [user]);
  
  // 加载项目列表（用于关联）
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectsApi.list({ pageSize: 100 });
        setExistingProjects(response.data || []);
      } catch (err) {
        console.error('加载项目列表失败:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // 检查当前用户是否为联合创始人或管理员
  const canCreateProject = user && (user.roleLevel === 'FOUNDER' || user.isAdmin);

  // 表单字段更新
  const handleChange = (field: string, value: string | string[] | number) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  // 切换负责人选择
  const toggleLeader = (userId: string) => {
    if (selectedLeaders.includes(userId)) {
      if (selectedLeaders.length > 1) {
        setSelectedLeaders(selectedLeaders.filter(id => id !== userId));
      }
    } else {
      setSelectedLeaders([...selectedLeaders, userId]);
      // 从成员中移除
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    }
  };
  
  // 切换成员选择
  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      if (!selectedLeaders.includes(userId)) {
        setSelectedMembers([...selectedMembers, userId]);
      }
    }
  };
  
  // 切换关联项目
  const toggleLinkedProject = (projectId: string) => {
    if (formData.linkedProjectIds.includes(projectId)) {
      handleChange('linkedProjectIds', formData.linkedProjectIds.filter(id => id !== projectId));
    } else {
      handleChange('linkedProjectIds', [...formData.linkedProjectIds, projectId]);
    }
  };
  
  // 添加股权持有人
  const addShareHolder = () => {
    const newId = `holder-${Date.now()}`;
    setShares([...shares, { id: newId, holderName: '', percentage: 0 }]);
  };
  
  // 移除股权持有人
  const removeShareHolder = (id: string) => {
    setShares(shares.filter(s => s.id !== id));
  };
  
  // 更新股权持有人
  const updateShareHolder = (id: string, field: keyof ShareHolder, value: string | number) => {
    setShares(shares.map(s => {
      if (s.id !== id) return s;
      
      // 如果选择了关联用户，自动填充持有人名称
      if (field === 'holderId' && value) {
        const selectedUser = users.find(u => u.id === value);
        if (selectedUser) {
          return { ...s, holderId: value as string, holderName: selectedUser.name };
        }
      }
      // 如果清空了关联用户，保留原有名称
      if (field === 'holderId' && !value) {
        return { ...s, holderId: undefined };
      }
      
      return { ...s, [field]: value };
    }));
  };
  
  // 计算剩余可分配股权
  const remainingPercentage = 49 - shares.filter(s => !s.isYuanzheng).reduce((sum, s) => sum + (s.percentage || 0), 0);
  
  // 验证当前步骤
  const validateStep = () => {
    switch (currentStep) {
      case 0: // 须知页
        if (!noticeConfirmed) {
          setError('请先阅读并确认须知内容');
          return false;
        }
        break;
      case 1: // 基本信息
        if (!formData.name.trim()) {
          setError('请输入项目名称');
          return false;
        }
        if (!formData.industry.trim()) {
          setError('请输入需求行业');
          return false;
        }
        if (selectedLeaders.length === 0) {
          setError('请至少选择一位负责人');
          return false;
        }
        break;
      case 2: // 股权结构
        if (remainingPercentage !== 0) {
          setError(`剩余 ${remainingPercentage}% 股权未分配`);
          return false;
        }
        const invalidShares = shares.filter(s => !s.isYuanzheng && !s.holderName.trim());
        if (invalidShares.length > 0) {
          setError('请填写所有股权持有人名称');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  // 下一步
  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // 上一步
  const prevStep = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateStep()) return;

    try {
      setSubmitting(true);
      setError(null);
      
      // 构建股权结构
      const projectShares = shares.map(s => ({
        holderName: s.holderName,
        holderId: s.holderId,
        percentage: s.percentage,
        note: s.note,
      }));
      
      const projectData: CreateProjectDto = {
        name: formData.name.trim(),
        businessType: formData.businessType,
        industry: formData.industry.trim() || undefined,
        region: formData.region.trim() || undefined,
        description: formData.description.trim() || undefined,
        businessStatus: formData.businessStatus,
        leaders: selectedLeaders,
        members: selectedMembers.length > 0 ? selectedMembers : undefined,
        shares: projectShares,
        visibilityScopeType: formData.visibilityScopeType,
        visibilityMinRoleLevel: formData.visibilityScopeType === 'ROLE_MIN_LEVEL' 
          ? formData.visibilityMinRoleLevel 
          : undefined,
        visibilityUserIds: formData.visibilityScopeType === 'CUSTOM' 
          ? formData.visibilityUserIds 
          : undefined,
        linkedProjectIds: formData.linkedProjectIds.length > 0 
          ? formData.linkedProjectIds 
          : undefined,
      };
      
      const project = await createProject(projectData);
      navigate(`/projects/${project.id}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 过滤用户列表
  const filteredLeaderUsers = users.filter(u => 
    u.name.toLowerCase().includes(leaderSearch.toLowerCase()) ||
    (u.organization && u.organization.toLowerCase().includes(leaderSearch.toLowerCase()))
  );
  
  const filteredMemberUsers = users.filter(u => 
    !selectedLeaders.includes(u.id) &&
    (u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (u.organization && u.organization.toLowerCase().includes(memberSearch.toLowerCase())))
  );
  
  const filteredProjects = existingProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // 渲染须知页
  const renderNoticePage = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-lg"
    >
      <Card className="p-lg">
        <h3 className="font-display text-lg text-deep-black mb-md">发布项目须知</h3>
        <div className="space-y-md text-sm text-charcoal leading-relaxed">
          <p>在发起新项目之前，请仔细阅读以下须知：</p>
          
          <div className="space-y-sm">
            <h4 className="font-medium text-deep-black">一、发起权限</h4>
            <p className="pl-md">
              • 只有<span className="text-champagne-gold font-medium">联合创始人</span>可以发起新项目<br />
              • 管理员可代发，但仍需指定联合创始人为发起人
            </p>
          </div>
          
          <div className="space-y-sm">
            <h4 className="font-medium text-deep-black">二、发布要求</h4>
            <p className="pl-md">
              • 必须明确<span className="text-champagne-gold">业务类型、行业和地区</span><br />
              • 必须指定<span className="text-champagne-gold">至少一位负责人</span><br />
              • 必须完整给出<span className="text-champagne-gold">初始股权结构</span>：51% 固定为元征，其余 49% 需完全分配
            </p>
          </div>
          
          <div className="space-y-sm">
            <h4 className="font-medium text-deep-black">三、审核流程</h4>
            <p className="pl-md">
              • 项目发布后将进入<span className="text-champagne-gold">"待管理员审核"</span>阶段<br />
              • 审核期间：其他成员可见项目概要，可提交加入申请<br />
              • 审核期间：<span className="text-error">不允许任何 Token 交易与分红操作</span>
            </p>
          </div>
          
          <div className="space-y-sm">
            <h4 className="font-medium text-deep-black">四、负责人职责</h4>
            <p className="pl-md">
              • 对需求的审核、响应方案选择与交易条款负责<br />
              • 负责确认资源是否实际被使用<br />
              • 负责在资源未使用/需修改时发起「响应需求交易修改/废弃表单」
            </p>
          </div>
        </div>
      </Card>
      
      <div 
        className={`flex items-center gap-sm p-md rounded-gallery cursor-pointer transition-all
          ${noticeConfirmed 
            ? 'bg-champagne-gold/10 border border-champagne-gold' 
            : 'bg-gallery-gray border border-silk-gray'
          }`}
        onClick={() => setNoticeConfirmed(!noticeConfirmed)}
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors
          ${noticeConfirmed 
            ? 'bg-champagne-gold border-champagne-gold' 
            : 'border-stone-gray'
          }`}
        >
          {noticeConfirmed && <Check size={14} className="text-deep-black" />}
        </div>
        <span className="text-sm text-deep-black">我已阅读并理解上述须知内容</span>
      </div>
    </motion.div>
  );

  // 渲染基本信息表单
  const renderBasicInfoForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-lg"
    >
      {/* 项目名称 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          项目名称 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="请输入项目名称"
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
        />
      </div>

      {/* 业务类型 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          业务类型 <span className="text-error">*</span>
        </label>
        <select
          value={formData.businessType}
          onChange={(e) => handleChange('businessType', e.target.value)}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
        >
          {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* 需求行业 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          需求行业 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.industry}
          onChange={(e) => handleChange('industry', e.target.value)}
          placeholder="如：新能源、金融科技、医疗健康"
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
        />
      </div>

      {/* 地区 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          地区
        </label>
        <input
          type="text"
          value={formData.region}
          onChange={(e) => handleChange('region', e.target.value)}
          placeholder="如：华东、华北、全国"
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
        />
      </div>

      {/* 业务状态 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          初始状态 <span className="text-error">*</span>
        </label>
        <div className="flex gap-sm flex-wrap">
          {Object.entries(BUSINESS_STATUS_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleChange('businessStatus', value)}
              className={`px-4 py-2 rounded-gallery text-sm transition-colors
                ${formData.businessStatus === value
                  ? 'bg-champagne-gold text-deep-black'
                  : 'bg-gallery-gray text-charcoal hover:bg-silk-gray'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-gray mt-2">注：项目创建后将先进入"待审核"状态，审核通过后进入此状态</p>
      </div>

      {/* 可见范围 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          可见范围 <span className="text-error">*</span>
        </label>
        <select
          value={formData.visibilityScopeType}
          onChange={(e) => handleChange('visibilityScopeType', e.target.value)}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
        >
          {VISIBILITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        {formData.visibilityScopeType === 'ROLE_MIN_LEVEL' && (
          <div className="mt-3">
            <select
              value={formData.visibilityMinRoleLevel}
              onChange={(e) => handleChange('visibilityMinRoleLevel', Number(e.target.value))}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
            >
              {ROLE_LEVEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 负责人 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          负责人 <span className="text-error">*</span>
        </label>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray" />
          <input
            type="text"
            value={leaderSearch}
            onChange={(e) => setLeaderSearch(e.target.value)}
            placeholder="搜索合伙人..."
            className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-4 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none"
          />
        </div>
        
        {/* 已选负责人 */}
        {selectedLeaders.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedLeaders.map(id => {
              const u = users.find(u => u.id === id);
              return u ? (
                <span 
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-champagne-gold/20 text-deep-black rounded-full text-sm"
                >
                  {u.name}
                  <button 
                    type="button"
                    onClick={() => toggleLeader(id)}
                    className="hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
        
        {/* 用户列表 */}
        <div className="max-h-40 overflow-y-auto border border-silk-gray rounded-gallery">
          {loadingUsers ? (
            <div className="p-4 text-center text-stone-gray">加载中...</div>
          ) : filteredLeaderUsers.length === 0 ? (
            <div className="p-4 text-center text-stone-gray">无匹配用户</div>
          ) : (
            filteredLeaderUsers.slice(0, 10).map(u => (
              <div
                key={u.id}
                onClick={() => toggleLeader(u.id)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors
                  ${selectedLeaders.includes(u.id) 
                    ? 'bg-champagne-gold/10' 
                    : 'hover:bg-gallery-gray'
                  }`}
              >
                <div>
                  <span className="text-sm text-deep-black">{u.name}</span>
                  {u.organization && (
                    <span className="text-xs text-stone-gray ml-2">{u.organization}</span>
                  )}
                </div>
                {selectedLeaders.includes(u.id) && (
                  <Check size={16} className="text-champagne-gold" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 普通成员 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          普通成员（可选）
        </label>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="搜索合伙人..."
            className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-4 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none"
          />
        </div>
        
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedMembers.map(id => {
              const u = users.find(u => u.id === id);
              return u ? (
                <span 
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gallery-gray text-charcoal rounded-full text-sm"
                >
                  {u.name}
                  <button 
                    type="button"
                    onClick={() => toggleMember(id)}
                    className="hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
        
        <div className="max-h-32 overflow-y-auto border border-silk-gray rounded-gallery">
          {filteredMemberUsers.length === 0 ? (
            <div className="p-4 text-center text-stone-gray text-sm">无可选成员</div>
          ) : (
            filteredMemberUsers.slice(0, 8).map(u => (
              <div
                key={u.id}
                onClick={() => toggleMember(u.id)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors
                  ${selectedMembers.includes(u.id) 
                    ? 'bg-gallery-gray' 
                    : 'hover:bg-gallery-gray'
                  }`}
              >
                <div>
                  <span className="text-sm text-deep-black">{u.name}</span>
                  {u.organization && (
                    <span className="text-xs text-stone-gray ml-2">{u.organization}</span>
                  )}
                </div>
                {selectedMembers.includes(u.id) && (
                  <Check size={16} className="text-charcoal" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 关联项目 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          关联项目（可选）
        </label>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-gray" />
          <input
            type="text"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="搜索项目..."
            className="w-full bg-pure-white border border-silk-gray rounded-gallery pl-10 pr-4 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none"
          />
        </div>
        
        {formData.linkedProjectIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.linkedProjectIds.map(id => {
              const p = existingProjects.find(p => p.id === id);
              return p ? (
                <span 
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gallery-gray text-charcoal rounded-full text-sm"
                >
                  {p.name}
                  <button 
                    type="button"
                    onClick={() => toggleLinkedProject(id)}
                    className="hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
        
        {!loadingProjects && filteredProjects.length > 0 && (
          <div className="max-h-32 overflow-y-auto border border-silk-gray rounded-gallery">
            {filteredProjects.slice(0, 6).map(p => (
              <div
                key={p.id}
                onClick={() => toggleLinkedProject(p.id)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors
                  ${formData.linkedProjectIds.includes(p.id) 
                    ? 'bg-gallery-gray' 
                    : 'hover:bg-gallery-gray'
                  }`}
              >
                <div>
                  <span className="text-sm text-deep-black">{p.name}</span>
                  <span className="text-xs text-stone-gray ml-2">
                    {BUSINESS_TYPE_LABELS[p.businessType] || p.businessType}
                  </span>
                </div>
                {formData.linkedProjectIds.includes(p.id) && (
                  <Check size={16} className="text-charcoal" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 项目描述/备注 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          项目描述/备注
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="请输入项目描述..."
          rows={3}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
        />
      </div>
    </motion.div>
  );

  // 渲染股权结构表单
  const renderSharesForm = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-lg"
    >
      <Card className="p-md bg-champagne-gold/10 border-champagne-gold/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-deep-black">元征固定股权</p>
            <p className="text-xs text-stone-gray">根据平台规则，元征固定持有 51% 股权</p>
          </div>
          <span className="font-display text-2xl text-champagne-gold">51%</span>
        </div>
      </Card>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-deep-black">可分配股权</p>
          <p className="text-xs text-stone-gray">剩余需要分配给项目成员</p>
        </div>
        <span className={`font-display text-2xl ${remainingPercentage === 0 ? 'text-success' : 'text-warning'}`}>
          {remainingPercentage}%
        </span>
      </div>
      
      <div className="divider" />
      
      <div className="space-y-md">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-deep-black">股权持有人</h4>
          <button
            type="button"
            onClick={addShareHolder}
            className="flex items-center gap-1 text-sm text-champagne-gold hover:text-champagne-gold/80"
          >
            <Plus size={16} />
            添加持有人
          </button>
        </div>
        
        {shares.filter(s => !s.isYuanzheng).map(share => (
          <div key={share.id} className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={share.holderName}
                onChange={(e) => updateShareHolder(share.id, 'holderName', e.target.value)}
                placeholder="持有人名称"
                className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none"
              />
              <select
                value={share.holderId || ''}
                onChange={(e) => updateShareHolder(share.id, 'holderId', e.target.value)}
                className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
              >
                <option value="">-- 关联用户（可选）--</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <div className="relative">
                <input
                  type="number"
                  value={share.percentage || ''}
                  onChange={(e) => updateShareHolder(share.id, 'percentage', Number(e.target.value))}
                  min={0}
                  max={49}
                  placeholder="0"
                  className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 pr-8 text-sm text-deep-black text-right focus:border-champagne-gold focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-gray text-sm">%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeShareHolder(share.id)}
              className="p-2 text-stone-gray hover:text-error transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ))}
        
        {shares.filter(s => !s.isYuanzheng).length === 0 && (
          <div className="text-center py-8 text-stone-gray text-sm">
            点击上方"添加持有人"分配剩余 49% 股权
          </div>
        )}
      </div>
    </motion.div>
  );

  // 权限检查
  if (!canCreateProject) {
    return (
      <SimpleLayout title="新建项目">
        <div className="px-lg py-xl text-center">
          <Card className="p-lg">
            <AlertCircle size={48} className="mx-auto text-warning mb-md" />
            <h3 className="font-display text-lg text-deep-black mb-sm">无权限</h3>
            <p className="text-sm text-stone-gray mb-lg">
              只有联合创始人或管理员可以发起新项目
            </p>
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              返回项目列表
            </Button>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="新建项目">
      <div className="px-lg py-lg">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-xl">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`flex items-center gap-2 px-3 py-2 rounded-gallery transition-colors
                  ${index === currentStep 
                    ? 'bg-champagne-gold text-deep-black' 
                    : index < currentStep
                      ? 'bg-champagne-gold/20 text-champagne-gold'
                      : 'bg-gallery-gray text-stone-gray'
                  }`}
              >
                <step.icon size={16} />
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight size={20} className="text-stone-gray mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-md bg-error/10 border-error/30 mb-lg">
                <div className="flex items-center gap-sm text-error">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 步骤内容 */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && renderNoticePage()}
          {currentStep === 1 && renderBasicInfoForm()}
          {currentStep === 2 && renderSharesForm()}
        </AnimatePresence>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between mt-xl pt-lg border-t border-silk-gray">
          {currentStep > 0 ? (
            <Button variant="secondary" onClick={prevStep}>
              <ChevronLeft size={16} />
              上一步
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              取消
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button variant="primary" onClick={nextStep}>
              下一步
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '创建中...' : '创建项目'}
            </Button>
          )}
        </div>
      </div>
    </SimpleLayout>
  );
}
