/**
 * 元征 · 合伙人赋能平台
 * 主应用组件
 * 
 * 高端简约现代艺术画廊风格
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ProtectedRoute } from './components';

// ================================
// 懒加载页面组件
// ================================

// 认证
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SetPasswordPage = lazy(() => import('./pages/auth/SetPasswordPage'));

// 主导航页面
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const DiscoverPage = lazy(() => import('./pages/discover/DiscoverPage'));
const InboxPage = lazy(() => import('./pages/inbox/InboxPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

// 项目
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const ProjectCreatePage = lazy(() => import('./pages/projects/ProjectCreatePage'));

// 需求
const DemandsPage = lazy(() => import('./pages/demands/DemandsPage'));
const DemandDetailPage = lazy(() => import('./pages/demands/DemandDetailPage'));
const DemandCreatePage = lazy(() => import('./pages/demands/DemandCreatePage'));
const ResponseCreatePage = lazy(() => import('./pages/demands/ResponseCreatePage'));

// 响应
const ResponseDetailPage = lazy(() => import('./pages/responses/ResponseDetailPage'));

// 合伙人
const PartnersPage = lazy(() => import('./pages/partners/PartnersPage'));
const PartnerDetailPage = lazy(() => import('./pages/partners/PartnerDetailPage'));

// 个人资料
const ProfileEditPage = lazy(() => import('./pages/profile/ProfileEditPage'));

// Token
const TokenPage = lazy(() => import('./pages/token/TokenPage'));
const TokenTransferPage = lazy(() => import('./pages/token/TokenTransferPage'));
const TokenHistoryPage = lazy(() => import('./pages/token/TokenHistoryPage'));
const TransactionDetailPage = lazy(() => import('./pages/token/TransactionDetailPage'));

// 人脉资源
const NetworkResourcesPage = lazy(() => import('./pages/network-resources/NetworkResourcesPage'));
const NetworkResourceDetailPage = lazy(() => import('./pages/network-resources/NetworkResourceDetailPage'));
const NetworkResourceCreatePage = lazy(() => import('./pages/network-resources/NetworkResourceCreatePage'));
const NetworkResourceReferralPage = lazy(() => import('./pages/network-resources/NetworkResourceReferralPage'));

// 会议
const MeetingsPage = lazy(() => import('./pages/meetings/MeetingsPage'));
const MeetingDetailPage = lazy(() => import('./pages/meetings/MeetingDetailPage'));
const MeetingCreatePage = lazy(() => import('./pages/meetings/MeetingCreatePage'));
const MeetingEditPage = lazy(() => import('./pages/meetings/MeetingEditPage'));
const MeetingMembersPage = lazy(() => import('./pages/meetings/MeetingMembersPage'));

// 场地预约
const BookingsPage = lazy(() => import('./pages/bookings/BookingsPage'));
const BookingCreatePage = lazy(() => import('./pages/bookings/BookingCreatePage'));
const BookingDetailPage = lazy(() => import('./pages/bookings/BookingDetailPage'));
const BookingEditPage = lazy(() => import('./pages/bookings/BookingEditPage'));

// 线下到访记录
const OnsiteVisitCreatePage = lazy(() => import('./pages/onsite-visits/OnsiteVisitCreatePage'));

// 我的邀请记录
const MyInvitationsPage = lazy(() => import('./pages/invitations/MyInvitationsPage'));

// 搜索
const SearchPage = lazy(() => import('./pages/search/SearchPage'));

// 场地
const VenuesPage = lazy(() => import('./pages/venues/VenuesPage'));

// 日历
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage'));

// 社群
const CommunityPage = lazy(() => import('./pages/community/CommunityPage'));
const PostDetailPage = lazy(() => import('./pages/community/PostDetailPage'));
const PostCreatePage = lazy(() => import('./pages/community/PostCreatePage'));

// 私信
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));
const NewConversationPage = lazy(() => import('./pages/messages/NewConversationPage'));
const ConversationPage = lazy(() => import('./pages/messages/ConversationPage'));

// 公告
const AnnouncementsPage = lazy(() => import('./pages/announcements/AnnouncementsPage'));

// 反馈
const FeedbackPage = lazy(() => import('./pages/feedback/FeedbackPage'));

// 设置
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

// 帮助
const HelpPage = lazy(() => import('./pages/help/HelpPage'));

// 管理员控制台
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminTokensPage = lazy(() => import('./pages/admin/AdminTokensPage'));
const AdminTokenGrantTasksPage = lazy(() => import('./pages/admin/AdminTokenGrantTasksPage'));
const AdminVenuesPage = lazy(() => import('./pages/admin/AdminVenuesPage'));
const AdminFeedbacksPage = lazy(() => import('./pages/admin/AdminFeedbacksPage'));
const AdminAnnouncementsPage = lazy(() => import('./pages/admin/AdminAnnouncementsPage'));
// 通知管理功能暂时禁用
// const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

// ================================
// 加载状态组件
// ================================
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-off-white">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-lg">
        {/* 外圈 */}
        <div className="absolute inset-0 border border-champagne-gold/30 rounded-full" />
        {/* 旋转指示器 */}
        <div className="absolute inset-0 border-2 border-transparent border-t-champagne-gold rounded-full animate-spin" />
      </div>
      <p className="text-caption text-stone-gray font-serif-cn tracking-wider">加载中...</p>
    </div>
  </div>
);

// ================================
// 主应用
// ================================
function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ================================
            公开路由
            ================================ */}
        <Route path="/login" element={<LoginPage />} />

        {/* ================================
            需要登录但可能需要设置密码
            ================================ */}
        <Route
          path="/set-password"
          element={
            <ProtectedRoute>
              <SetPasswordPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            主导航页面（底部导航）
            ================================ */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <DiscoverPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            项目相关
            ================================ */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/create"
          element={
            <ProtectedRoute>
              <ProjectCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            需求相关
            ================================ */}
        <Route
          path="/demands"
          element={
            <ProtectedRoute>
              <DemandsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/demands/create"
          element={
            <ProtectedRoute>
              <DemandCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/demands/:id"
          element={
            <ProtectedRoute>
              <DemandDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/demands/:id/respond"
          element={
            <ProtectedRoute>
              <ResponseCreatePage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            响应相关
            ================================ */}
        <Route
          path="/responses/:id"
          element={
            <ProtectedRoute>
              <ResponseDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            合伙人相关
            ================================ */}
        <Route
          path="/partners"
          element={
            <ProtectedRoute>
              <PartnersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/partners/:id"
          element={
            <ProtectedRoute>
              <PartnerDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            个人资料
            ================================ */}
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            Token 相关
            ================================ */}
        <Route
          path="/token"
          element={
            <ProtectedRoute>
              <TokenPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/token/transfer"
          element={
            <ProtectedRoute>
              <TokenTransferPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/token/history"
          element={
            <ProtectedRoute>
              <TokenHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/token/transactions/:id"
          element={
            <ProtectedRoute>
              <TransactionDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            人脉资源相关
            ================================ */}
        <Route
          path="/network-resources"
          element={
            <ProtectedRoute>
              <NetworkResourcesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/network-resources/create"
          element={
            <ProtectedRoute>
              <NetworkResourceCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/network-resources/:id/referral"
          element={
            <ProtectedRoute>
              <NetworkResourceReferralPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network-resources/:id"
          element={
            <ProtectedRoute>
              <NetworkResourceDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            会议相关
            ================================ */}
        <Route
          path="/meetings"
          element={
            <ProtectedRoute>
              <MeetingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meetings/create"
          element={
            <ProtectedRoute>
              <MeetingCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meetings/:id"
          element={
            <ProtectedRoute>
              <MeetingDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meetings/:id/edit"
          element={
            <ProtectedRoute>
              <MeetingEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meetings/:id/members"
          element={
            <ProtectedRoute>
              <MeetingMembersPage />
            </ProtectedRoute>
          }
        />
        {/* 兼容旧路由 */}
        <Route
          path="/meetings/:id/participants"
          element={
            <ProtectedRoute>
              <MeetingMembersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meetings/:id/guests"
          element={
            <ProtectedRoute>
              <MeetingMembersPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            场地预约相关
            ================================ */}
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <BookingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/create"
          element={
            <ProtectedRoute>
              <BookingCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bookings/:id"
          element={
            <ProtectedRoute>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id/edit"
          element={
            <ProtectedRoute>
              <BookingEditPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            场地
            ================================ */}
        <Route
          path="/venues"
          element={
            <ProtectedRoute>
              <VenuesPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            线下到访
            ================================ */}
        <Route
          path="/onsite-visits/create"
          element={
            <ProtectedRoute>
              <OnsiteVisitCreatePage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            我的邀请记录
            ================================ */}
        <Route
          path="/my-invitations"
          element={
            <ProtectedRoute>
              <MyInvitationsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            日历
            ================================ */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            社群相关
            ================================ */}
        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/posts/:id"
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/create"
          element={
            <ProtectedRoute>
              <PostCreatePage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            私信相关
            ================================ */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages/new"
          element={
            <ProtectedRoute>
              <NewConversationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages/:userId"
          element={
            <ProtectedRoute>
              <ConversationPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            公告
            ================================ */}
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            反馈
            ================================ */}
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <FeedbackPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            设置
            ================================ */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/notification"
          element={
            <ProtectedRoute>
              <SettingsPage defaultTab="notification" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/privacy"
          element={
            <ProtectedRoute>
              <SettingsPage defaultTab="privacy" />
            </ProtectedRoute>
          }
        />
        {/* ================================
            帮助
            ================================ */}
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            管理员控制台
            ================================ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute>
              <AdminProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tokens"
          element={
            <ProtectedRoute>
              <AdminTokensPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/token-grant-tasks"
          element={
            <ProtectedRoute>
              <AdminTokenGrantTasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/venues"
          element={
            <ProtectedRoute>
              <AdminVenuesPage />
            </ProtectedRoute>
          }
        />
        {/* 通知管理功能暂时禁用 */}
        <Route
          path="/admin/feedbacks"
          element={
            <ProtectedRoute>
              <AdminFeedbacksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedRoute>
              <AdminAnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* ================================
            默认重定向
            ================================ */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
