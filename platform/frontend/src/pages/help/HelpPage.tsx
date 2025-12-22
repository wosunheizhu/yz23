/**
 * 帮助与反馈页面
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout';
import { Card } from '../../components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// FAQ 列表
const faqs = [
  {
    question: '如何发布需求？',
    answer: '点击底部导航"+"按钮，选择"发布需求"，填写需求信息后提交即可。',
  },
  {
    question: '如何获取 Token？',
    answer: 'Token 可通过以下方式获取：管理员赠与、座谈会邀请嘉宾奖励、项目分红等。',
  },
  {
    question: '如何预约场地？',
    answer: '进入"日历"页面，点击右下角"+"按钮，选择"新建场地预约"，填写预约信息后提交。',
  },
  {
    question: '人脉资源如何引荐？',
    answer: '在人脉资源详情页点击"引荐"按钮，选择引荐目标用户并填写引荐说明。',
  },
  {
    question: '如何查看项目进展？',
    answer: '进入项目详情页，切换到"时间线"标签页可查看项目所有动态记录。',
  },
];

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <SimpleLayout title="帮助与反馈">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-lg py-lg space-y-xl"
      >
        {/* 快捷入口 */}
        <motion.section variants={itemVariants}>
          <Card>
            <button
              onClick={() => navigate('/feedback')}
              className="w-full flex items-center justify-between p-lg hover:bg-off-white transition-colors rounded-gallery"
            >
              <div className="flex items-center gap-md">
                <MessageSquare size={20} className="text-champagne-gold" />
                <div className="text-left">
                  <p className="text-body text-deep-black">意见反馈</p>
                  <p className="text-tiny text-stone-gray">提交建议或报告问题</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-stone-gray" />
            </button>
          </Card>
        </motion.section>

        {/* 常见问题 */}
        <motion.section variants={itemVariants}>
          <h3 className="text-tiny tracking-[0.15em] uppercase text-stone-gray mb-sm px-sm">
            常见问题
          </h3>
          <Card className="divide-y divide-silk-gray">
            {faqs.map((faq, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between p-lg cursor-pointer hover:bg-off-white transition-colors list-none">
                  <div className="flex items-center gap-md">
                    <HelpCircle size={18} className="text-stone-gray shrink-0" />
                    <span className="text-body text-deep-black">{faq.question}</span>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className="text-stone-gray transition-transform group-open:rotate-90" 
                  />
                </summary>
                <div className="px-lg pb-lg pl-12">
                  <p className="text-sm text-stone-gray">{faq.answer}</p>
                </div>
              </details>
            ))}
          </Card>
        </motion.section>

        {/* 版本信息 */}
        <motion.section variants={itemVariants} className="text-center pt-lg">
          <p className="text-tiny text-stone-gray">元征 · 合伙人赋能平台</p>
          <p className="text-tiny text-stone-gray">Version 1.0.0</p>
        </motion.section>
      </motion.div>
    </SimpleLayout>
  );
}






