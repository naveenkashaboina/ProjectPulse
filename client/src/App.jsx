import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AcceptInvite from './pages/AcceptInvite';
import OrgDashboard from './pages/OrgDashboard';
import ProjectList from './pages/ProjectList';
import KanbanBoard from './pages/KanbanBoard';
import TaskDetail from './pages/TaskDetail';
import BacklogView from './pages/BacklogView';
import TimelineView from './pages/TimelineView';
import WorkloadDashboard from './pages/WorkloadDashboard';
import ReportsView from './pages/ReportsView';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import ActivityFeed from './pages/ActivityFeed';
import NotificationList from './pages/NotificationList';

import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const organizations = useAuthStore((state) => state.organizations);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (organizations && organizations.length > 0) {
    return <Navigate to={`/orgs/${organizations[0]._id}/dashboard`} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const setNotAuthenticated = useAuthStore((state) => state.setNotAuthenticated);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchMe();
    } else {
      setNotAuthenticated();
    }
  }, [fetchMe, setNotAuthenticated]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/invitations/:token/accept" element={<AcceptInvite />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Protected routes wrapped in MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/orgs/:orgId/dashboard" element={<OrgDashboard />} />
        <Route path="/orgs/:orgId/projects" element={<ProjectList />} />
        <Route path="/projects/:projectId/board" element={<KanbanBoard />} />
        <Route path="/projects/:projectId/backlog" element={<BacklogView />} />
        <Route path="/projects/:projectId/timeline" element={<TimelineView />} />
        <Route path="/projects/:projectId/workload" element={<WorkloadDashboard />} />
        <Route path="/projects/:projectId/reports" element={<ReportsView />} />
        <Route path="/projects/:projectId/issues" element={<IssueList />} />
        <Route path="/projects/:projectId/issues/:issueId" element={<IssueDetail />} />
        <Route path="/projects/:projectId/activity" element={<ActivityFeed />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/notifications" element={<NotificationList />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
