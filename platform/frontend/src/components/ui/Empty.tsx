/**
 * Empty 空状态组件
 * 高端简约现代艺术画廊风格
 */

import { ReactNode } from 'react';
import { Inbox, Search, FileX, Users, Calendar, Bell } from 'lucide-react';
import { Button } from './Button';

type EmptyType = 'default' | 'search' | 'data' | 'network' | 'calendar' | 'notification';

interface EmptyProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const defaultContent: Record<EmptyType, { icon: ReactNode; title: string; description: string }> = {
  default: {
    icon: <Inbox size={48} strokeWidth={0.75} />,
    title: '暂无内容',
    description: '这里还没有任何内容',
  },
  search: {
    icon: <Search size={48} strokeWidth={0.75} />,
    title: '未找到结果',
    description: '尝试调整搜索条件或筛选项',
  },
  data: {
    icon: <FileX size={48} strokeWidth={0.75} />,
    title: '暂无数据',
    description: '数据正在准备中',
  },
  network: {
    icon: <Users size={48} strokeWidth={0.75} />,
    title: '暂无人脉',
    description: '开始添加您的第一个人脉资源',
  },
  calendar: {
    icon: <Calendar size={48} strokeWidth={0.75} />,
    title: '暂无日程',
    description: '您当前没有待办事项',
  },
  notification: {
    icon: <Bell size={48} strokeWidth={0.75} />,
    title: '暂无通知',
    description: '您的通知会显示在这里',
  },
};

export const Empty = ({
  type = 'default',
  title,
  description,
  action,
  icon,
}: EmptyProps) => {
  const content = defaultContent[type];

  return (
    <div className="flex flex-col items-center justify-center py-2xl text-center">
      {/* 图标 */}
      <div className="mb-lg text-stone-gray">
        {icon || content.icon}
      </div>

      {/* 标题 */}
      <h3 className="font-serif-cn text-title text-charcoal mb-sm">
        {title || content.title}
      </h3>

      {/* 描述 */}
      <p className="text-caption text-stone-gray max-w-xs mb-lg">
        {description || content.description}
      </p>

      {/* 操作按钮 */}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default Empty;






