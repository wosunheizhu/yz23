/**
 * 用户仪表盘 DTO - Node 10
 * PRD 6.8: 仪表盘模块
 */

import { z } from 'zod';

// ================================
// 响应类型
// ================================

/**
 * 我的项目摘要
 * PRD 6.8.2: 我的项目 & 实时进程
 */
export interface MyProjectSummary {
  id: string;
  name: string;
  businessType: string;
  industry: string | null;
  businessStatus: string;
  role: 'LEADER' | 'MEMBER';
  hasNewEvents: boolean;  // 红点
  hasNewDemands: boolean; // 红点
  hasNewResponses: boolean; // 红点（仅负责人）
}

/**
 * 我的代办项
 * PRD 6.8.2 D3: 代办区块
 */
export interface MyTodoItem {
  id: string;
  type: 'RESPONSE_REVIEW' | 'TOKEN_CONFIRM' | 'MEETING_MINUTES' | 'JOIN_REQUEST' | 'UNREAD_MESSAGE' | 'ADMIN_PROJECT_REVIEW' | 'ADMIN_TOKEN_REVIEW' | 'ADMIN_GRANT_TASK';
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  relatedId: string;
  path?: string; // 跳转路径
  createdAt: string;
  isNew: boolean;
  isAdmin?: boolean; // 管理员专属待办
}

/**
 * Token 摘要
 * PRD 6.8.3: 我的 Token & 发起交易
 */
export interface TokenSummary {
  balance: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    counterpartyName: string | null;
    reason: string | null;
    createdAt: string;
  }>;
}

/**
 * 我的贡献统计
 * PRD 6.8.4: 我的贡献
 */
export interface MyContributionStats {
  totalCount: number;
  resources: {
    count: number;
    recent: Array<{
      id: string;
      name: string;
      category: string;
      linkedProjectCount: number;
    }>;
  };
  leadProjects: {
    count: number;
    projects: Array<{
      id: string;
      name: string;
      businessStatus: string;
      hasValueRecord: boolean;
    }>;
  };
  memberProjects: {
    count: number;
    recent: Array<{
      id: string;
      name: string;
      businessStatus: string;
    }>;
  };
  invitedGuests: {
    count: number;
    recent: Array<{
      id: string;
      name: string;
      organization: string | null;
      meetingTitle: string;
    }>;
  };
}

/**
 * 平台价值曲线
 * PRD 6.8.5: 元征平台价值曲线
 */
export interface PlatformValueCurve {
  totalValue: number;
  currency: string;
  dataPoints: Array<{
    period: string; // 如 '2024-Q1'
    cumulativeValue: number;
    periodValue: number;
  }>;
}

/**
 * 信箱统计
 * PRD 6.8.6: 信箱入口
 */
export interface InboxBadge {
  total: number;
  byCategory: {
    announcement: number;
    system: number;
    vote: number;
    dm: number;
    mention: number;
  };
}

/**
 * 仪表盘完整响应
 */
export interface DashboardResponse {
  user: {
    id: string;
    name: string;
    roleLevel: string;
    avatar: string | null;
  };
  tokenBalance: number;
  inboxUnread: number;
  myProjects: MyProjectSummary[];
  myTodos: MyTodoItem[];
  tokenSummary: TokenSummary;
  contributions: MyContributionStats;
  platformValue: PlatformValueCurve;
  inboxBadge: InboxBadge;
}

// ================================
// 查询参数
// ================================

export const DashboardQuerySchema = z.object({
  projectLimit: z.coerce.number().int().min(1).max(50).default(10),
  todoLimit: z.coerce.number().int().min(1).max(20).default(10),
  transactionLimit: z.coerce.number().int().min(1).max(20).default(5),
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

