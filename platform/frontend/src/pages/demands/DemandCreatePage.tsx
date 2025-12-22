/**
 * 创建需求页面
 * PRD 12: 需求发布（普通需求 + 人脉需求）
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Info, CheckCircle, Users, Briefcase, ChevronRight, ChevronLeft, Coins } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Badge } from '../../components/ui';
import { createDemand, CreateDemandDto, DEMAND_TYPE_LABELS, URGENCY_LABELS, BUSINESS_TYPE_LABELS } from '../../api/demands';
import { getProjects, ProjectListItem } from '../../api/projects';
import { useAuthStore } from '../../stores/authStore';

// Token 奖励参考价值
const TOKEN_REWARD_REFERENCE = [
  { level: '上市公司董监高、相关金融从业高管', amount: 500 },
  { level: '上市公司董事长或实控人', amount: 1000 },
  { level: '处级领导', amount: 500 },
  { level: '厅级领导', amount: 1000 },
  { level: '部委部级领导', amount: 2000 },
];

// 目标组织类型
const TARGET_ORG_TYPES = [
  { value: 'LISTED_COMPANY', label: '上市公司' },
  { value: 'STATE_OWNED', label: '国资' },
  { value: 'MINISTRY', label: '部委' },
  { value: 'SECURITIES', label: '券商' },
  { value: 'FUND', label: '基金' },
  { value: 'BANK', label: '银行' },
  { value: 'OTHER', label: '其他' },
];

// 目标职位层级
const TARGET_POSITION_LEVELS = [
  { value: 'CHAIRMAN_CONTROLLER', label: '董事长/实控人' },
  { value: 'BOARD_SUPERVISOR', label: '董监高' },
  { value: 'EXECUTIVE', label: '高管' },
  { value: 'DEPARTMENT_LEVEL', label: '处级' },
  { value: 'BUREAU_LEVEL', label: '司局级' },
  { value: 'MINISTER_LEVEL', label: '部级' },
  { value: 'OTHER', label: '其他' },
];

// 职位层级对应的 Token 默认值
const POSITION_TOKEN_DEFAULTS: Record<string, number> = {
  'CHAIRMAN_CONTROLLER': 1000,  // 董事长/实控人
  'BOARD_SUPERVISOR': 500,      // 董监高
  'EXECUTIVE': 500,             // 高管
  'DEPARTMENT_LEVEL': 500,      // 处级
  'BUREAU_LEVEL': 1000,         // 司局级
  'MINISTER_LEVEL': 2000,       // 部级
  'OTHER': 0,                   // 其他
};

// 期望对接方式
const CONTACT_METHODS = [
  { value: 'ONLINE_CALL', label: '线上电话' },
  { value: 'OFFLINE_MEETING', label: '线下面谈' },
  { value: 'SEMINAR', label: '座谈会' },
  { value: 'OTHER', label: '其他' },
];

// 紧急程度
const URGENCY_OPTIONS = [
  { value: 'THIS_WEEK', label: '本周' },
  { value: 'TWO_WEEKS', label: '两周内' },
  { value: 'THIS_MONTH', label: '本月' },
  { value: 'NOT_URGENT', label: '不急' },
];

// 激励形式
const INCENTIVE_TYPES = [
  { value: 'TOKEN', label: 'Token' },
  { value: 'SHARE', label: '股份' },
  { value: 'OTHER', label: '其他' },
];

type DemandTypeChoice = 'NETWORK' | 'GENERAL';

export default function DemandCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const { user } = useAuthStore();
  
  // 步骤状态
  const [step, setStep] = useState<'notice' | 'type' | 'form'>('notice');
  const [demandTypeChoice, setDemandTypeChoice] = useState<DemandTypeChoice>('NETWORK'); // 默认人脉需求
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // 通用表单字段
  const [formData, setFormData] = useState({
    projectId: projectIdFromUrl || '',
    name: '',
    description: '',
    demandType: 'NETWORK', // 默认人脉需求
    businessType: 'OTHER',
    industry: 'OTHER',
    visibilityScopeType: 'ALL',
    visibilityMinRoleLevel: undefined as number | undefined, // 用于联合创始人可见
    urgency: 'THIS_MONTH',
    incentiveTypes: ['TOKEN'] as string[],
    // 激励数值 - 默认都为空，Token 根据职位层级自动设置
    tokenAmount: undefined as number | undefined,
    sharePercentage: undefined as number | undefined,
    otherIncentive: '',
    note: '',
  });
  
  // 人脉需求特有字段
  const [networkFormData, setNetworkFormData] = useState({
    targetOrgType: '' as string,
    targetPositionLevel: '' as string,
    targetIndustry: '',
    targetRegion: '',
    demandPurpose: '', // 需求目的
    contactMethod: 'OFFLINE_MEETING',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const result = await getProjects({ page: 1, pageSize: 100 });
      setProjects(result.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleNetworkChange = (field: string, value: any) => {
    setNetworkFormData({ ...networkFormData, [field]: value });
    setError(null);
    
    // 当选择目标职位层级时，自动更新 Token 默认值
    if (field === 'targetPositionLevel' && value) {
      const defaultTokenAmount = POSITION_TOKEN_DEFAULTS[value];
      if (defaultTokenAmount !== undefined) {
        setFormData(prev => ({ ...prev, tokenAmount: defaultTokenAmount || undefined }));
      }
    }
  };

  const toggleIncentiveType = (type: string) => {
    const current = formData.incentiveTypes;
    if (current.includes(type)) {
      // 如果只剩下一个激励形式，不允许取消选中
      if (current.length > 1) {
        handleChange('incentiveTypes', current.filter(t => t !== type));
      }
    } else {
      handleChange('incentiveTypes', [...current, type]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('请输入需求标题');
      return;
    }
    if (!formData.description.trim()) {
      setError('请输入需求描述');
      return;
    }
    
    // 人脉需求额外验证
    if (demandTypeChoice === 'NETWORK') {
      if (!networkFormData.targetOrgType) {
        setError('请选择目标组织类型');
        return;
      }
      if (!networkFormData.targetPositionLevel) {
        setError('请选择目标职位层级');
        return;
      }
      if (!networkFormData.demandPurpose.trim()) {
        setError('请输入需求目的');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 构建需求描述（人脉需求附带目标画像）
      let fullDescription = formData.description;
      if (demandTypeChoice === 'NETWORK') {
        const orgLabel = TARGET_ORG_TYPES.find(o => o.value === networkFormData.targetOrgType)?.label || '';
        const posLabel = TARGET_POSITION_LEVELS.find(p => p.value === networkFormData.targetPositionLevel)?.label || '';
        fullDescription = `【目标画像】\n组织类型：${orgLabel}\n职位层级：${posLabel}${networkFormData.targetIndustry ? `\n行业：${networkFormData.targetIndustry}` : ''}${networkFormData.targetRegion ? `\n地区：${networkFormData.targetRegion}` : ''}\n\n【需求目的】\n${networkFormData.demandPurpose}\n\n【需求描述】\n${formData.description}`;
      }
      
      // 构建激励形式（必须至少有一种，使用用户输入的数值）
      const demandData: CreateDemandDto = {
        projectId: formData.projectId || undefined,
        name: formData.name,
        description: fullDescription,
        demandType: demandTypeChoice,
        businessType: formData.businessType,
        industry: formData.industry,
        ownerIds: user ? [user.id] : [],
        primaryOwnerId: user?.id || '',
        visibilityScopeType: formData.visibilityScopeType,
        visibilityMinRoleLevel: formData.visibilityMinRoleLevel,
        // 激励形式 - 使用用户填写的数值
        rewardTokenAmount: formData.incentiveTypes.includes('TOKEN') ? formData.tokenAmount : undefined,
        rewardSharePercentage: formData.incentiveTypes.includes('SHARE') ? formData.sharePercentage : undefined,
        rewardOther: formData.incentiveTypes.includes('OTHER') ? (formData.otherIncentive || '待商议') : undefined,
        // 将紧急程度放入备注
        note: formData.note || `紧急程度：${URGENCY_LABELS[formData.urgency as keyof typeof URGENCY_LABELS] || formData.urgency}`,
        // 人脉需求目标画像
        targetProfile: demandTypeChoice === 'NETWORK' ? {
          organization: networkFormData.targetOrgType,
          title: networkFormData.targetPositionLevel,
          industryTags: networkFormData.targetIndustry ? [networkFormData.targetIndustry] : undefined,
          region: networkFormData.targetRegion || undefined,
          description: networkFormData.demandPurpose,
        } : undefined,
      };
      
      const demand = await createDemand(demandData);
      navigate(`/demands/${demand.id}`, { replace: true });
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      if (errorData?.details?.message) {
        setError(errorData.details.message);
      } else if (errorData?.message) {
        setError(errorData.message);
      } else {
        setError('创建失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 须知页面
  const renderNotice = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-lg py-lg space-y-xl"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-champagne-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8 text-champagne-gold" />
        </div>
        <h2 className="text-lg font-semibold text-deep-black mb-2">需求发布须知</h2>
        <p className="text-sm text-stone-gray">请仔细阅读以下内容后再发布需求</p>
      </div>

      {/* Token 奖励参考 */}
      <Card className="p-4 bg-champagne-gold/5 border-champagne-gold/20">
        <h3 className="font-medium text-deep-black mb-3 flex items-center gap-2">
          <Coins className="w-5 h-5 text-champagne-gold" />
          人脉资源引荐 Token 价值参考
        </h3>
        <div className="space-y-2">
          {TOKEN_REWARD_REFERENCE.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-1.5 border-b border-silk-gray/30 last:border-0">
              <span className="text-sm text-stone-gray">{item.level}</span>
              <span className="text-sm font-semibold text-champagne-gold">{item.amount} Token</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 发布须知内容 */}
      <Card className="p-4">
        <h3 className="font-medium text-deep-black mb-3">发布须知</h3>
        <ul className="space-y-2 text-sm text-stone-gray">
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">1.</span>
            <span>需求发布后将对平台内相应级别的合伙人可见，请确保内容准确</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">2.</span>
            <span>人脉需求请尽量详细描述目标画像，以便其他合伙人更好地响应</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">3.</span>
            <span>响应被接受后，响应方将自动加入项目成员</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">4.</span>
            <span>请合理设置激励形式，Token 奖励参考上方标准</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">5.</span>
            <span>如需修改或废弃响应，需资源方确认或管理员裁决</span>
          </li>
        </ul>
      </Card>

      {/* 确认阅读 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setNoticeAccepted(!noticeAccepted)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            noticeAccepted ? 'bg-champagne-gold border-champagne-gold' : 'border-stone-gray'
          }`}
        >
          {noticeAccepted && <CheckCircle className="w-4 h-4 text-white" />}
        </button>
        <span className="text-sm text-stone-gray">我已阅读并理解以上须知内容</span>
      </div>

      <Button
        variant="primary"
        className="w-full"
        disabled={!noticeAccepted}
        onClick={() => setStep('type')}
      >
        继续
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );

  // 选择需求类型
  const renderTypeChoice = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-lg py-lg space-y-xl"
    >
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-deep-black mb-2">选择需求类型</h2>
        <p className="text-sm text-stone-gray">请选择您要发布的需求类型</p>
      </div>

      <div className="space-y-4">
        {/* 人脉需求 - 推荐 */}
        <button
          onClick={() => setDemandTypeChoice('NETWORK')}
          className={`w-full p-5 text-left rounded-gallery border-2 transition-all ${
            demandTypeChoice === 'NETWORK'
              ? 'border-champagne-gold bg-champagne-gold/5'
              : 'border-silk-gray hover:border-stone-gray'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              demandTypeChoice === 'NETWORK' ? 'bg-champagne-gold/20' : 'bg-pearl-white'
            }`}>
              <Users className={`w-6 h-6 ${
                demandTypeChoice === 'NETWORK' ? 'text-champagne-gold' : 'text-stone-gray'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-deep-black">人脉需求</span>
                <Badge variant="outline" className="text-champagne-gold border-champagne-gold">推荐</Badge>
              </div>
              <p className="text-sm text-stone-gray">
                需要引荐到特定类型的人或组织，例如：引荐某省国资平台负责人
              </p>
            </div>
          </div>
        </button>

        {/* 普通需求 */}
        <button
          onClick={() => setDemandTypeChoice('GENERAL')}
          className={`w-full p-5 text-left rounded-gallery border-2 transition-all ${
            demandTypeChoice === 'GENERAL'
              ? 'border-champagne-gold bg-champagne-gold/5'
              : 'border-silk-gray hover:border-stone-gray'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              demandTypeChoice === 'GENERAL' ? 'bg-champagne-gold/20' : 'bg-pearl-white'
            }`}>
              <Briefcase className={`w-6 h-6 ${
                demandTypeChoice === 'GENERAL' ? 'text-champagne-gold' : 'text-stone-gray'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-deep-black">普通需求</span>
              </div>
              <p className="text-sm text-stone-gray">
                找标的、找资金、找方案、找资源等一般性需求
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep('notice')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一步
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => {
            handleChange('demandType', demandTypeChoice);
            setStep('form');
          }}
        >
          下一步
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );

  // 表单页面
  const renderForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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

      {/* 需求类型标识 */}
      <div className="flex items-center gap-2 pb-2 border-b border-silk-gray">
        <Badge variant={demandTypeChoice === 'NETWORK' ? 'default' : 'outline'}>
          {demandTypeChoice === 'NETWORK' ? '人脉需求' : '普通需求'}
        </Badge>
        <button
          onClick={() => setStep('type')}
          className="text-sm text-champagne-gold hover:underline"
        >
          切换类型
        </button>
      </div>

      {/* 关联项目 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          关联项目（可选）
        </label>
        <select
          value={formData.projectId}
          onChange={(e) => handleChange('projectId', e.target.value)}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
        >
          <option value="">不关联项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* 需求标题 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          需求标题 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={demandTypeChoice === 'NETWORK' ? '例如：引荐某省国资平台负责人' : '请输入需求标题'}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
        />
      </div>

      {/* 人脉需求特有字段 */}
      {demandTypeChoice === 'NETWORK' && (
        <>
          {/* 目标画像 */}
          <Card className="p-4 bg-pearl-white border-none">
            <h4 className="font-medium text-deep-black mb-4">目标画像 <span className="text-error">*</span></h4>
            
            {/* 目标组织类型 */}
            <div className="mb-4">
              <label className="block text-stone-gray text-xs mb-2">目标组织类型</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_ORG_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleNetworkChange('targetOrgType', opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      networkFormData.targetOrgType === opt.value
                        ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                        : 'border-silk-gray text-stone-gray'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 目标职位层级 */}
            <div className="mb-4">
              <label className="block text-stone-gray text-xs mb-2">目标职位层级</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_POSITION_LEVELS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleNetworkChange('targetPositionLevel', opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      networkFormData.targetPositionLevel === opt.value
                        ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                        : 'border-silk-gray text-stone-gray'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 行业和地区 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-gray text-xs mb-2">目标行业（可选）</label>
                <input
                  type="text"
                  value={networkFormData.targetIndustry}
                  onChange={(e) => handleNetworkChange('targetIndustry', e.target.value)}
                  placeholder="如：金融、医药"
                  className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-stone-gray text-xs mb-2">目标地区（可选）</label>
                <input
                  type="text"
                  value={networkFormData.targetRegion}
                  onChange={(e) => handleNetworkChange('targetRegion', e.target.value)}
                  placeholder="如：北京、上海"
                  className="w-full bg-pure-white border border-silk-gray rounded-gallery px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
                />
              </div>
            </div>
          </Card>

          {/* 需求目的 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              需求目的 <span className="text-error">*</span>
            </label>
            <textarea
              value={networkFormData.demandPurpose}
              onChange={(e) => handleNetworkChange('demandPurpose', e.target.value)}
              placeholder="想达成什么？如：见面洽谈合作、项目推进、信息确认..."
              rows={3}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* 期望对接方式 */}
          <div>
            <label className="block text-stone-gray text-xs mb-2 tracking-wider">
              期望对接方式
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleNetworkChange('contactMethod', opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    networkFormData.contactMethod === opt.value
                      ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                      : 'border-silk-gray text-stone-gray'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 需求描述 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          {demandTypeChoice === 'NETWORK' ? '补充说明' : '需求描述'} <span className="text-error">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={demandTypeChoice === 'NETWORK' ? '其他需要说明的信息...' : '请详细描述您的需求...'}
          rows={4}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* 紧急程度 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          紧急程度
        </label>
        <div className="flex flex-wrap gap-2">
          {URGENCY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleChange('urgency', opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                formData.urgency === opt.value
                  ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                  : 'border-silk-gray text-stone-gray'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 激励形式 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          激励形式（可多选）
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {INCENTIVE_TYPES.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleIncentiveType(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                formData.incentiveTypes.includes(opt.value)
                  ? 'border-champagne-gold bg-champagne-gold/10 text-deep-black'
                  : 'border-silk-gray text-stone-gray'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        {/* 激励数值输入区域 */}
        <div className="space-y-3">
          {formData.incentiveTypes.includes('TOKEN') && (
            <div className="flex items-center gap-3 p-3 bg-pearl-white rounded-lg">
              <span className="text-sm text-stone-gray shrink-0">Token 数量</span>
              <input
                type="number"
                value={formData.tokenAmount ?? ''}
                onChange={(e) => handleChange('tokenAmount', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                className="flex-1 bg-pure-white border border-silk-gray rounded-lg px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
                placeholder={demandTypeChoice === 'NETWORK' && networkFormData.targetPositionLevel ? '根据职位自动设置' : '请输入 Token 数量'}
              />
              <span className="text-sm text-stone-gray">Token</span>
            </div>
          )}
          
          {formData.incentiveTypes.includes('SHARE') && (
            <div className="flex items-center gap-3 p-3 bg-pearl-white rounded-lg">
              <span className="text-sm text-stone-gray shrink-0">股份占比</span>
              <input
                type="number"
                value={formData.sharePercentage ?? ''}
                onChange={(e) => handleChange('sharePercentage', e.target.value ? Number(e.target.value) : undefined)}
                min={0}
                max={49}
                step={0.1}
                className="flex-1 bg-pure-white border border-silk-gray rounded-lg px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
                placeholder="请输入股份占比"
              />
              <span className="text-sm text-stone-gray">%</span>
            </div>
          )}
          
          {formData.incentiveTypes.includes('OTHER') && (
            <div className="p-3 bg-pearl-white rounded-lg">
              <span className="text-sm text-stone-gray block mb-2">其他激励描述</span>
              <input
                type="text"
                value={formData.otherIncentive}
                onChange={(e) => handleChange('otherIncentive', e.target.value)}
                className="w-full bg-pure-white border border-silk-gray rounded-lg px-3 py-2 text-sm text-deep-black focus:border-champagne-gold focus:outline-none"
                placeholder="请描述其他激励形式，如：现金奖励、合作机会等"
              />
            </div>
          )}
        </div>
      </div>

      {/* 业务类型（普通需求） */}
      {demandTypeChoice === 'GENERAL' && (
        <div>
          <label className="block text-stone-gray text-xs mb-2 tracking-wider">
            业务类型
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
      )}

      {/* 可见范围 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          可见范围
        </label>
        <select
          value={formData.visibilityMinRoleLevel === 3 ? 'COFOUNDER' : formData.visibilityScopeType}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'COFOUNDER') {
              // 联合创始人可见：使用 ROLE_MIN_LEVEL + minRoleLevel=3
              handleChange('visibilityScopeType', 'ROLE_MIN_LEVEL');
              handleChange('visibilityMinRoleLevel', 3);
            } else if (value === 'ROLE_MIN_LEVEL') {
              // 核心合伙人及以上：使用 ROLE_MIN_LEVEL + minRoleLevel=2
              handleChange('visibilityScopeType', 'ROLE_MIN_LEVEL');
              handleChange('visibilityMinRoleLevel', 2);
            } else {
              handleChange('visibilityScopeType', value);
              handleChange('visibilityMinRoleLevel', undefined);
            }
          }}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
        >
          <option value="ALL">全部合伙人可见</option>
          <option value="ROLE_MIN_LEVEL">核心合伙人及以上可见</option>
          <option value="COFOUNDER">联合创始人可见</option>
        </select>
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          备注（可选）
        </label>
        <textarea
          value={formData.note}
          onChange={(e) => handleChange('note', e.target.value)}
          placeholder="其他需要说明的信息..."
          rows={2}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* 按钮组 */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setStep('type')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一步
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '发布中...' : '发布需求'}
        </Button>
      </div>
    </motion.div>
  );

  if (loadingProjects) {
    return (
      <SimpleLayout title="发布需求">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="发布需求">
      <AnimatePresence mode="wait">
        {step === 'notice' && renderNotice()}
        {step === 'type' && renderTypeChoice()}
        {step === 'form' && renderForm()}
      </AnimatePresence>
    </SimpleLayout>
  );
}
