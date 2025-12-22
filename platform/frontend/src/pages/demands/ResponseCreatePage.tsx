/**
 * 需求响应提交页面
 * PRD 13: 响应 Response（v2 继承 + v3 人脉交付物增强）
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Info, CheckCircle, ChevronRight, ChevronLeft, Users, Briefcase, Coins } from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card, Button, Loading, Badge, Avatar } from '../../components/ui';
import { getDemand, Demand } from '../../api/demands';
import { createResponse, CreateResponseDto } from '../../api/responses';
import { useAuthStore } from '../../stores/authStore';

// Token 奖励参考价值
const TOKEN_REWARD_REFERENCE = [
  { level: '上市公司董监高、相关金融从业高管', amount: 500 },
  { level: '上市公司董事长或实控人', amount: 1000 },
  { level: '处级领导', amount: 500 },
  { level: '厅级领导', amount: 1000 },
  { level: '部委部级领导', amount: 2000 },
];

// 激励形式
const INCENTIVE_TYPES = [
  { value: 'TOKEN', label: 'Token' },
  { value: 'SHARE', label: '股份' },
  { value: 'OTHER', label: '其他' },
];

export default function ResponseCreatePage() {
  const navigate = useNavigate();
  const { id: demandId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  
  // 步骤状态
  const [step, setStep] = useState<'notice' | 'form'>('notice');
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [demand, setDemand] = useState<Demand | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    content: '',
    expectedReward: 0,
    rewardType: 'TOKEN',
    note: '',
    // 人脉资源交付物（可选）
    networkResourceDescription: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demandId) {
      loadDemand(demandId);
    }
  }, [demandId]);

  const loadDemand = async (id: string) => {
    try {
      setLoading(true);
      const data = await getDemand(id);
      setDemand(data);
    } catch (err) {
      console.error('Failed to load demand:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      setError('请输入响应内容');
      return;
    }
    if (formData.expectedReward <= 0) {
      setError('请输入期望激励数量');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 构建响应内容（包含人脉资源交付物描述）
      let fullContent = formData.content;
      if (formData.networkResourceDescription.trim()) {
        fullContent = `【本次响应提供的人脉资源】\n${formData.networkResourceDescription}\n\n【响应内容】\n${formData.content}`;
      }
      
      const responseData: CreateResponseDto = {
        demandId: demandId!,
        content: fullContent,
        intendedTokenAmount: formData.rewardType === 'TOKEN' ? formData.expectedReward : undefined,
        intendedSharePercentage: formData.rewardType === 'SHARE' ? formData.expectedReward : undefined,
        intendedOther: formData.rewardType === 'OTHER' ? `${formData.expectedReward}` : undefined,
        note: formData.note || undefined,
      };
      
      const response = await createResponse(responseData);
      navigate(`/responses/${response.id}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '提交失败，请重试');
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
        <h2 className="text-lg font-semibold text-deep-black mb-2">响应须知</h2>
        <p className="text-sm text-stone-gray">请仔细阅读以下内容后再提交响应</p>
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

      {/* 响应须知内容 */}
      <Card className="p-4">
        <h3 className="font-medium text-deep-black mb-3">响应须知</h3>
        <ul className="space-y-2 text-sm text-stone-gray">
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">1.</span>
            <span><strong>响应被接受后</strong>，您将自动成为该项目成员</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">2.</span>
            <span>响应被接受后状态进入"<strong>已接受待使用</strong>"</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">3.</span>
            <span>如需<strong>修改或废弃</strong>已接受的响应：</span>
          </li>
          <li className="flex gap-2 pl-6">
            <span className="text-stone-gray shrink-0">-</span>
            <span>需求负责人发起修改/废弃申请</span>
          </li>
          <li className="flex gap-2 pl-6">
            <span className="text-stone-gray shrink-0">-</span>
            <span>资源方（您）确认或拒绝</span>
          </li>
          <li className="flex gap-2 pl-6">
            <span className="text-stone-gray shrink-0">-</span>
            <span>如资源方拒绝，将由管理员裁决</span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">4.</span>
            <span>全流程记录将写入项目时间线，<strong>不可删除只能更正</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="text-champagne-gold shrink-0">5.</span>
            <span>请<strong>如实填写期望激励</strong>，参考上方 Token 价值标准</span>
          </li>
        </ul>
      </Card>

      {/* 目标需求信息 */}
      {demand && (
        <Card className="p-4">
          <h3 className="font-medium text-deep-black mb-3">响应目标需求</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={demand.demandType === 'NETWORK' ? 'default' : 'outline'} size="sm">
                {demand.demandType === 'NETWORK' ? '人脉需求' : '普通需求'}
              </Badge>
              <span className="text-sm text-stone-gray">
                来自项目：{demand.projectName || '未知项目'}
              </span>
            </div>
            <h4 className="font-medium text-deep-black">{demand.name}</h4>
            <p className="text-sm text-stone-gray line-clamp-3">{demand.description}</p>
            <div className="flex items-center gap-2 pt-2">
              <Avatar name={demand.ownerName || ''} src={demand.ownerAvatar} size="sm" />
              <span className="text-sm text-stone-gray">{demand.ownerName}</span>
            </div>
          </div>
        </Card>
      )}

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
        onClick={() => setStep('form')}
      >
        继续填写响应
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
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

      {/* 需求信息简要 */}
      {demand && (
        <Card className="p-4 bg-pearl-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={demand.demandType === 'NETWORK' ? 'default' : 'outline'} size="sm">
              {demand.demandType === 'NETWORK' ? '人脉需求' : '普通需求'}
            </Badge>
            <span className="text-xs text-stone-gray">
              {demand.projectName}
            </span>
          </div>
          <h4 className="font-medium text-deep-black text-sm">{demand.name}</h4>
        </Card>
      )}

      {/* 人脉资源交付物（v3 增强） */}
      {demand?.demandType === 'NETWORK' && (
        <Card className="p-4 bg-champagne-gold/5 border-champagne-gold/20">
          <h4 className="font-medium text-deep-black mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-champagne-gold" />
            本次响应提供的人脉资源（推荐填写）
          </h4>
          <textarea
            value={formData.networkResourceDescription}
            onChange={(e) => handleChange('networkResourceDescription', e.target.value)}
            placeholder="描述您提供的人脉资源，如：&#10;- 姓名/组织/职位&#10;- 您与他的关系&#10;- 能提供什么帮助"
            rows={4}
            className="w-full bg-pure-white border border-champagne-gold/30 rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none text-sm"
          />
          <p className="text-xs text-stone-gray mt-2">
            详细描述人脉资源可帮助需求方更好地评估响应价值
          </p>
        </Card>
      )}

      {/* 响应内容 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          响应内容 <span className="text-error">*</span>
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder="请详细描述您的响应内容，包括能提供什么资源/帮助，以及预期效果..."
          rows={5}
          className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* 期望激励 */}
      <div>
        <label className="block text-stone-gray text-xs mb-2 tracking-wider">
          期望激励 <span className="text-error">*</span>
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={formData.expectedReward || ''}
              onChange={(e) => handleChange('expectedReward', Number(e.target.value))}
              placeholder="输入数量"
              min={0}
              className="w-full bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black placeholder:text-stone-gray focus:border-champagne-gold focus:outline-none transition-colors"
            />
          </div>
          <select
            value={formData.rewardType}
            onChange={(e) => handleChange('rewardType', e.target.value)}
            className="bg-pure-white border border-silk-gray rounded-gallery px-4 py-3 text-deep-black focus:border-champagne-gold focus:outline-none transition-colors"
          >
            {INCENTIVE_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-stone-gray mt-2">
          参考：上市公司董监高 500 Token，董事长/实控人 1000 Token，部级领导 2000 Token
        </p>
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
          onClick={() => setStep('notice')}
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
          {submitting ? '提交中...' : '提交响应'}
        </Button>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <SimpleLayout title="提交响应">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </SimpleLayout>
    );
  }

  if (!demand) {
    return (
      <SimpleLayout title="提交响应">
        <div className="flex items-center justify-center h-64">
          <p className="text-stone-gray">需求不存在</p>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout title="提交响应">
      <AnimatePresence mode="wait">
        {step === 'notice' && renderNotice()}
        {step === 'form' && renderForm()}
      </AnimatePresence>
    </SimpleLayout>
  );
}

