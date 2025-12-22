/**
 * 类型定义
 * 元征 · 合伙人赋能平台
 */

// 用户角色级别
export type RoleLevel = 'PARTNER' | 'CORE_PARTNER' | 'FOUNDER';

// 用户信息
export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  gender?: string;
  avatar?: string;
  signature?: string;
  selfDescription?: string;
  expertiseAreas: string[];
  organization?: string;
  roleLevel: RoleLevel;
  isAdmin: boolean;
  joinedAt: string;
}

// Token 账户
export interface TokenAccount {
  id: string;
  userId: string;
  balance: number;
  initialAmount: number;
}

// 项目状态
export type ProjectReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type ProjectBusinessStatus = 'ONGOING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';

// 业务类型
export type BusinessType = 
  | 'AGREEMENT_TRANSFER'
  | 'MERGER_ACQUISITION'
  | 'INDUSTRY_ENABLEMENT'
  | 'DEBT_BUSINESS'
  | 'OTHER';

// 项目信息
export interface Project {
  id: string;
  name: string;
  businessType: BusinessType;
  industry?: string;
  region?: string;
  description?: string;
  reviewStatus: ProjectReviewStatus;
  businessStatus: ProjectBusinessStatus;
  createdAt: string;
  updatedAt: string;
}

// 需求类型
export type DemandType = 'GENERAL' | 'NETWORK';
export type DemandStatus = 'OPEN' | 'CLOSED';

// 需求信息
export interface Demand {
  id: string;
  projectId: string;
  name: string;
  businessType: BusinessType;
  description: string;
  industry?: string;
  status: DemandStatus;
  demandType: DemandType;
  rewardSharePercentage?: number;
  rewardTokenAmount?: number;
  rewardOther?: string;
  createdAt: string;
}

// 响应状态
export type ResponseStatus = 
  | 'SUBMITTED'
  | 'ACCEPTED_PENDING_USAGE'
  | 'USED'
  | 'REJECTED'
  | 'ABANDONED'
  | 'MODIFIED';

// 响应信息
export interface DemandResponse {
  id: string;
  demandId: string;
  responderId: string;
  content: string;
  status: ResponseStatus;
  intendedSharePercentage?: number;
  intendedTokenAmount?: number;
  intendedOther?: string;
  finalSharePercentage?: number;
  finalTokenAmount?: number;
  finalOther?: string;
  createdAt: string;
}

// 人脉资源类型
export type NetworkResourceType = 'PERSON' | 'ORG';

// 人脉资源
export interface NetworkResource {
  id: string;
  resourceType: NetworkResourceType;
  name?: string;
  organization?: string;
  title?: string;
  industryTags: string[];
  region?: string;
  relationshipStrength: number;
  relationshipDesc?: string;
  createdByUserId: string;
  createdAt: string;
}

// 引荐类型
export type ReferralType = 'MEETING' | 'PROJECT' | 'DEMAND' | 'OTHER';

// 人脉引荐
export interface NetworkReferral {
  id: string;
  networkResourceId: string;
  referrerUserId: string;
  referralType: ReferralType;
  description: string;
  createdAt: string;
}

// 场地信息
export interface Venue {
  id: string;
  name: string;
  address?: string;
  capacity?: number;
  supportsMeal: boolean;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
}

// 场地预约
export interface VenueBooking {
  id: string;
  venueId: string;
  title: string;
  purpose?: string;
  startTime: string;
  endTime: string;
  ownerUserId: string;
  mealIncluded: boolean;
  status: 'CONFIRMED' | 'CANCELLED' | 'FINISHED';
}

// 会议类型
export type MeetingKind = 'DAILY' | 'COMPANY';
export type MeetingLevel = 'INTERNAL' | 'EXTERNAL';

// 会议信息
export interface Meeting {
  id: string;
  topic: string;
  meetingKind: MeetingKind;
  meetingLevel: MeetingLevel;
  venueId?: string;
  location?: string;
  startTime: string;
  endTime: string;
  projectId?: string;
  status: 'SCHEDULED' | 'FINISHED' | 'CANCELLED';
}

// 外部嘉宾分类
export type GuestCategory = 
  | 'PUBLIC_CO_DMHG'
  | 'FIN_EXEC'
  | 'PUBLIC_CHAIRMAN_CONTROLLER'
  | 'MINISTRY_LEADER'
  | 'OTHER';

// 外部嘉宾
export interface ExternalGuest {
  id: string;
  meetingId: string;
  name: string;
  organization: string;
  title: string;
  invitedByUserId: string;
  guestCategory: GuestCategory;
  defaultGrantAmount: number;
}

// 信箱消息分类
export type InboxCategory = 'ANNOUNCEMENT' | 'SYSTEM' | 'VOTE' | 'DM' | 'MENTION';

// 信箱消息
export interface InboxItem {
  id: string;
  userId: string;
  category: InboxCategory;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}






