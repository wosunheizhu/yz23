/**
 * 用户仪表盘 API - Node 10
 * PRD 6.8: 仪表盘模块
 */

import { apiClient } from './client';

// ================================
// 类型定义
// ================================

export interface MyProjectSummary {
  id: string;
  name: string;
  businessType: string;
  industry: string | null;
  businessStatus: string;
  role: 'LEADER' | 'MEMBER';
  hasNewEvents: boolean;
  hasNewDemands: boolean;
  hasNewResponses: boolean;
}

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

export interface PlatformValueCurve {
  totalValue: number;
  currency: string;
  dataPoints: Array<{
    period: string;
    cumulativeValue: number;
    periodValue: number;
  }>;
}

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

export interface DashboardResponse {
  user: {
    id: string;
    name: string;
    roleLevel: string;
    avatarUrl: string | null;
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

export interface DashboardQuery {
  projectLimit?: number;
  todoLimit?: number;
  transactionLimit?: number;
}

// ================================
// API 方法
// ================================

export const dashboardApi = {
  /**
   * 获取完整仪表盘数据
   * PRD 6.8: 仪表盘模块
   */
  get: (query?: DashboardQuery) =>
    apiClient.get<DashboardResponse>('/dashboard', { params: query }),

  /**
   * 获取我的项目列表
   * PRD 6.8.2: 我的项目 & 实时进程
   */
  getProjects: (limit?: number) =>
    apiClient.get<{ data: MyProjectSummary[] }>('/dashboard/projects', {
      params: { limit },
    }),

  /**
   * 获取我的代办事项
   * PRD 6.8.2 D3: 代办区块
   */
  getTodos: (limit?: number) =>
    apiClient.get<{ data: MyTodoItem[] }>('/dashboard/todos', {
      params: { limit },
    }),

  /**
   * 获取 Token 摘要
   * PRD 6.8.3: 我的 Token & 发起交易
   */
  getTokenSummary: (limit?: number) =>
    apiClient.get<TokenSummary>('/dashboard/token', {
      params: { limit },
    }),

  /**
   * 获取我的贡献统计
   * PRD 6.8.4: 我的贡献
   */
  getContributions: () =>
    apiClient.get<MyContributionStats>('/dashboard/contributions'),

  /**
   * 获取平台价值曲线
   * PRD 6.8.5: 元征平台价值曲线
   */
  getPlatformValue: () =>
    apiClient.get<PlatformValueCurve>('/dashboard/platform-value'),

  /**
   * 获取信箱未读统计
   * PRD 6.8.6: 信箱入口
   */
  getInboxBadge: () =>
    apiClient.get<InboxBadge>('/dashboard/inbox-badge'),
};

