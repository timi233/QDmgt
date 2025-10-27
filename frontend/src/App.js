import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import ManagerRoute from './components/ManagerRoute';
import LoginPage from './pages/LoginPage';
import ChannelsPage from './pages/ChannelsPage';
import AppNavbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ExecutionPlansPage from './pages/ExecutionPlansPage';
import UsersPage from './pages/UsersPage';
import UnifiedTargetsPage from './pages/UnifiedTargetsPage';

function App() {
  const withLayout = (page) => (
    <>
      <AppNavbar />
      {page}
    </>
  );

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                {withLayout(<DashboardPage />)}
              </PrivateRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <PrivateRoute>
                {withLayout(<ChannelsPage />)}
              </PrivateRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ManagerRoute element={withLayout(<AssignmentsPage />)} />
            }
          />
          <Route
            path="/unified-targets"
            element={
              <PrivateRoute>
                {withLayout(<UnifiedTargetsPage />)}
              </PrivateRoute>
            }
          />
          <Route
            path="/execution-plans"
            element={
              <PrivateRoute>
                {withLayout(<ExecutionPlansPage />)}
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute element={withLayout(<UsersPage />)} />
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
