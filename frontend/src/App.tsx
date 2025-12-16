import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from 'antd'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from './components/ErrorBoundary/ErrorFallback'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import UserManagement from './pages/users/UserManagement'
import Profile from './pages/profile/Profile'
import DistributorList from './pages/distributors/DistributorList'
import DistributorCreate from './pages/distributors/DistributorCreate'
import DistributorDetail from './pages/distributors/DistributorDetail'
import DistributorEdit from './pages/distributors/DistributorEdit'
import { Workspace } from './pages/workspace/Workspace'
import { TaskDetail } from './pages/tasks/TaskDetail'
import Dashboard from './pages/dashboard/Dashboard'
import TargetList from './pages/targets/TargetList'
import TargetCreate from './pages/targets/TargetCreate'
import TargetDetail from './pages/targets/TargetDetail'
import TargetEdit from './pages/targets/TargetEdit'
import WorkPlanList from './pages/work-plans/WorkPlanList'
import WorkPlanDetail from './pages/work-plans/WorkPlanDetail'
import WorkPlanEdit from './pages/work-plans/WorkPlanEdit'
import VisitList from './pages/visits/VisitList'
import VisitCreate from './pages/visits/VisitCreate'
import VisitDetail from './pages/visits/VisitDetail'
import HealthScoreDetail from './pages/health-score/HealthScoreDetail'
import TrainingList from './pages/trainings/TrainingList'
import TrainingDetail from './pages/trainings/TrainingDetail'
import TrainingCreate from './pages/trainings/TrainingCreate'
import TrainingEdit from './pages/trainings/TrainingEdit'
import ResourceList from './pages/resources/ResourceList'
import ResourceDetail from './pages/resources/ResourceDetail'
import ResourceCreate from './pages/resources/ResourceCreate'
import ResourceEdit from './pages/resources/ResourceEdit'
import TicketList from './pages/tickets/TicketList'
import TicketDetail from './pages/tickets/TicketDetail'
import TicketCreate from './pages/tickets/TicketCreate'
import TicketEdit from './pages/tickets/TicketEdit'
import CertificationList from './pages/certifications/CertificationList'
import CertificationDetail from './pages/certifications/CertificationDetail'
import CertificationCreate from './pages/certifications/CertificationCreate'
import CertificationEdit from './pages/certifications/CertificationEdit'
import CertificationVerify from './pages/certifications/CertificationVerify'
import PrivateRoute from './utils/PrivateRoute'
import RoleRoute from './utils/RoleRoute'
import AppHeader from './components/Layout/AppHeader'
import SideMenu from './components/Layout/SideMenu'
import { isAuthenticated } from './services/authService'

const { Content } = Layout

function AppContent() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  const checkAuth = useCallback(() => {
    setAuthenticated(isAuthenticated())
  }, [])

  useEffect(() => {
    checkAuth()
  }, [location.pathname, checkAuth])

  const isPublicRoute = location.pathname === '/login' || location.pathname === '/register'

  // Public routes - render without Layout
  if (isPublicRoute) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </ErrorBoundary>
    )
  }

  // Protected routes - render with Layout
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <Layout style={{ minHeight: '100vh' }}>
        <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
        <Layout>
          {authenticated && <SideMenu collapsed={collapsed} />}
          <Content style={{ background: '#f0f2f5' }}>
          <Routes>
          {/* Sales routes - require authentication (sales or leader) */}
          <Route
            path="/workspace"
            element={
              <PrivateRoute>
                <Workspace />
              </PrivateRoute>
            }
          />

          {/* Task routes */}
          <Route
            path="/tasks/:id"
            element={
              <PrivateRoute>
                <TaskDetail />
              </PrivateRoute>
            }
          />

          {/* Distributor routes */}
          <Route
            path="/distributors"
            element={
              <PrivateRoute>
                <DistributorList />
              </PrivateRoute>
            }
          />
          <Route
            path="/distributors/create"
            element={
              <PrivateRoute>
                <DistributorCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/distributors/:id"
            element={
              <PrivateRoute>
                <DistributorDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/distributors/:id/edit"
            element={
              <PrivateRoute>
                <DistributorEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <UserManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          {/* Visit routes */}
          <Route
            path="/visits"
            element={
              <PrivateRoute>
                <VisitList />
              </PrivateRoute>
            }
          />
          <Route
            path="/visits/create"
            element={
              <PrivateRoute>
                <VisitCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/visits/:id"
            element={
              <PrivateRoute>
                <VisitDetail />
              </PrivateRoute>
            }
          />

          {/* Health score routes */}
          <Route
            path="/health-scores"
            element={
              <PrivateRoute>
                <HealthScoreDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/health-scores/:distributorId"
            element={
              <PrivateRoute>
                <HealthScoreDetail />
              </PrivateRoute>
            }
          />

          {/* Leader routes - require leader role */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['leader']}>
                <Dashboard />
              </RoleRoute>
            }
          />

          {/* Target routes - leader only */}
          <Route
            path="/targets"
            element={
              <RoleRoute allowedRoles={['leader']}>
                <TargetList />
              </RoleRoute>
            }
          />
          <Route
            path="/targets/create"
            element={
              <RoleRoute allowedRoles={['leader']}>
                <TargetCreate />
              </RoleRoute>
            }
          />
          <Route
            path="/targets/:id"
            element={
              <RoleRoute allowedRoles={['leader']}>
                <TargetDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/targets/:id/edit"
            element={
              <RoleRoute allowedRoles={['leader']}>
                <TargetEdit />
              </RoleRoute>
            }
          />

          {/* Work plan routes - available to all authenticated users */}
          <Route
            path="/work-plans"
            element={
              <PrivateRoute>
                <WorkPlanList />
              </PrivateRoute>
            }
          />
          <Route
            path="/work-plans/:id"
            element={
              <PrivateRoute>
                <WorkPlanDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/work-plans/:id/edit"
            element={
              <PrivateRoute>
                <WorkPlanEdit />
              </PrivateRoute>
            }
          />

          {/* Training routes - available to all authenticated users */}
          <Route
            path="/trainings"
            element={
              <PrivateRoute>
                <TrainingList />
              </PrivateRoute>
            }
          />
          <Route
            path="/trainings/create"
            element={
              <PrivateRoute>
                <TrainingCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/trainings/:id"
            element={
              <PrivateRoute>
                <TrainingDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/trainings/:id/edit"
            element={
              <PrivateRoute>
                <TrainingEdit />
              </PrivateRoute>
            }
          />

          {/* Resource routes - available to all authenticated users */}
          <Route
            path="/resources"
            element={
              <PrivateRoute>
                <ResourceList />
              </PrivateRoute>
            }
          />
          <Route
            path="/resources/create"
            element={
              <PrivateRoute>
                <ResourceCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/resources/:id"
            element={
              <PrivateRoute>
                <ResourceDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/resources/:id/edit"
            element={
              <PrivateRoute>
                <ResourceEdit />
              </PrivateRoute>
            }
          />

          {/* Ticket routes - available to all authenticated users */}
          <Route
            path="/tickets"
            element={
              <PrivateRoute>
                <TicketList />
              </PrivateRoute>
            }
          />
          <Route
            path="/tickets/create"
            element={
              <PrivateRoute>
                <TicketCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <PrivateRoute>
                <TicketDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/tickets/:id/edit"
            element={
              <PrivateRoute>
                <TicketEdit />
              </PrivateRoute>
            }
          />

          {/* Certification routes - available to all authenticated users */}
          <Route
            path="/certifications"
            element={
              <PrivateRoute>
                <CertificationList />
              </PrivateRoute>
            }
          />
          <Route
            path="/certifications/create"
            element={
              <PrivateRoute>
                <CertificationCreate />
              </PrivateRoute>
            }
          />
          <Route
            path="/certifications/verify"
            element={
              <PrivateRoute>
                <CertificationVerify />
              </PrivateRoute>
            }
          />
          <Route
            path="/certifications/:id"
            element={
              <PrivateRoute>
                <CertificationDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/certifications/:id/edit"
            element={
              <PrivateRoute>
                <CertificationEdit />
              </PrivateRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Routes>
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  )
}

export default function App() {
  return <AppContent />
}
