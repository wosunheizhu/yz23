/**
 * 意见反馈页
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Bug, Lightbulb, HelpCircle, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, Input, Button, Modal } from '@/components/ui';
import { feedbacksApi, FeedbackType } from '@/api/feedbacks';

const feedbackTypes: Array<{
  type: FeedbackType;
  icon: React.ElementType;
  label: string;
  description: string;
}> = [
  {
    type: 'SUGGESTION',
    icon: Lightbulb,
    label: '功能建议',
    description: '提出新功能或改进建议',
  },
  {
    type: 'BUG',
    icon: Bug,
    label: '问题反馈',
    description: '报告系统问题或异常',
  },
  {
    type: 'COMPLAINT',
    icon: MessageSquare,
    label: '投诉',
    description: '投诉服务或体验问题',
  },
  {
    type: 'OTHER',
    icon: HelpCircle,
    label: '其他',
    description: '其他类型的反馈',
  },
];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !title.trim() || !content.trim()) {
      alert('请填写完整信息');
      return;
    }

    try {
      setLoading(true);
      const response = await feedbacksApi.submitFeedback({
        feedbackType: selectedType,
        title: title.trim(),
        content: content.trim(),
      });

      if (response.success) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate(-1);
  };

  return (
    <AppLayout showBottomNav={false} headerTitle="意见反馈" showBack>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-6"
      >
        {/* 类型选择 */}
        <div>
          <h3 className="text-sm font-medium text-ink-black mb-3">反馈类型</h3>
          <div className="grid grid-cols-2 gap-3">
            {feedbackTypes.map(({ type, icon: Icon, label, description }) => (
              <Card
                key={type}
                className={`p-4 cursor-pointer transition-all ${
                  selectedType === type 
                    ? 'border-ink-black bg-ink-black/5' 
                    : 'hover:border-stone-gray'
                }`}
                onClick={() => setSelectedType(type)}
              >
                <Icon className={`w-6 h-6 mb-2 ${
                  selectedType === type ? 'text-ink-black' : 'text-stone-gray'
                }`} />
                <h4 className="font-medium text-ink-black mb-1">{label}</h4>
                <p className="text-xs text-stone-gray">{description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* 反馈内容 */}
        <div className="space-y-4">
          <Input
            label="标题"
            placeholder="请简要描述您的反馈"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm text-stone-gray mb-1.5">
              详细描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-4 py-3 border border-mist-gray rounded-lg text-sm resize-none focus:outline-none focus:border-ink-black min-h-[150px]"
              placeholder="请详细描述您的反馈内容，以便我们更好地了解和处理..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-stone-gray mt-1">
              {content.length}/500
            </p>
          </div>
        </div>

        {/* 提示 */}
        <Card className="p-4 bg-pearl-white border-none">
          <p className="text-xs text-stone-gray leading-relaxed">
            感谢您的反馈！我们会认真阅读每一条意见，并在必要时与您联系。
            您的反馈将帮助我们不断改进产品和服务。
          </p>
        </Card>

        {/* 提交按钮 */}
        <div className="pt-4">
          <Button
            className="w-full"
            onClick={handleSubmit}
            loading={loading}
            disabled={!selectedType || !title.trim() || !content.trim()}
          >
            提交反馈
          </Button>
        </div>
      </motion.div>

      {/* 成功弹窗 */}
      <Modal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        title=""
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-ink-black mb-2">提交成功</h3>
          <p className="text-sm text-stone-gray mb-6">
            感谢您的反馈，我们会尽快处理
          </p>
          <Button className="w-full" onClick={handleSuccessClose}>
            返回
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
