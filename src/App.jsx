import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Domain Page Modules
import {
  HomePage,
  MentorProfilePage,
  BecomeMentorPage,
  LoginPage,
  HelpPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
} from './pages/public';

import {
  ChatPage,
  SessionRoomPage,
  ContractDetailPage,
  ContractsListPage,
} from './pages/shared';

import {
  LearnerDashboard,
  LearnerExplorePage,
  PostProblemPage,
  MyProblemsPage,
  LearnerSessionsPage,
  LearnerPaymentsPage,
  LearnerReviewsPage,
  LearnerFavoritesPage,
  LearnerHistoryPage,
  LearnerProfilePage,
  LearnerSettingsPage,
  LearnerNotificationsPage,
} from './pages/learner';

import {
  MentorDashboard,
  ProblemRequestsPage,
  MyProposalsPage,
  MentorSessionsPage,
  MentorCalendarPage,
  MentorEarningsPage,
  MentorAvailabilityPage,
  MentorReviewsPage,
  MentorProfileEditPage,
  MentorSettingsPage,
  MentorNotificationsPage,
} from './pages/mentor';

import {
  AdminOverviewPage,
  AdminUsersPage,
  AdminMentorsPage,
  AdminVerificationPage,
  AdminDisputesPage,
  AdminPayoutsPage,
  AdminCommissionsPage,
  AdminRefundsPage,
  AdminSessionsPage,
  AdminPaymentsPage,
  AdminProblemsPage,
  AdminReviewsPage,
  AdminReportsPage,
  AdminNotificationsPage,
  AdminSettingsPage,
  AdminAuditLogsPage,
  AdminContentPage,
  AdminContractsPage,
  AdminSupportRequestsPage,
  SuperadminPage,
} from './pages/admin';


// Guard
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/mentor/:id" element={<MentorProfilePage />} />
      <Route path="/become-a-mentor" element={<BecomeMentorPage />} />
      <Route path="/explore" element={<Navigate to="/learner/explore" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Interactions */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session"
        element={
          <ProtectedRoute>
            <SessionRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:id"
        element={
          <ProtectedRoute>
            <SessionRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:id"
        element={
          <ProtectedRoute>
            <ContractDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Learner Portal */}
      <Route
        path="/learner/dashboard"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/explore"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerExplorePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/post-problem"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <PostProblemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/my-problems"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <MyProblemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/problems"
        element={<Navigate to="/learner/my-problems" replace />}
      />
      <Route
        path="/learner/sessions"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerSessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/payments"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/reviews"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/favorites"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerFavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/history"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/profile"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/settings"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/notifications"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <LearnerNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learner/contracts"
        element={
          <ProtectedRoute allowedRoles={['learner', 'admin', 'superadmin']}>
            <ContractsListPage />
          </ProtectedRoute>
        }
      />

      {/* Mentor Portal */}
      <Route
        path="/mentor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/explore-problems"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <ProblemRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/problem-requests"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <ProblemRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/requests"
        element={<Navigate to="/mentor/explore-problems" replace />}
      />
      <Route
        path="/mentor/my-proposals"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MyProposalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/proposals"
        element={<Navigate to="/mentor/my-proposals" replace />}
      />
      <Route
        path="/mentor/sessions"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorSessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/calendar"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/earnings"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorEarningsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/availability"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/reviews"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/profile"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorProfileEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/settings"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/notifications"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <MentorNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/contracts"
        element={
          <ProtectedRoute allowedRoles={['mentor', 'admin', 'superadmin']}>
            <ContractsListPage />
          </ProtectedRoute>
        }
      />


      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminUsersPage initialRole="all" pageTitle="All Users" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mentors"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminMentorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/learners"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminUsersPage initialRole="learner" pageTitle="Learner Accounts" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verification"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminVerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminDisputesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payouts"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminPayoutsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/commissions"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminCommissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/refunds"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminRefundsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contracts"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminContractsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sessions"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminSessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/messages"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/problems"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminProblemsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminReviewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminAuditLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/content"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminContentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/support"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminSupportRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/support-requests"
        element={<Navigate to="/admin/support" replace />}
      />

      {/* Superadmin Portal */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperadminPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
